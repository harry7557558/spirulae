# generate meshgen_trig_loss.h

import numpy as np
import scipy.optimize
import matplotlib.pyplot as plt

import casadi as cs
from casadi import SX

def points2mat(v0, v1, v2):
    """returns normalized matrix and size squared"""
    xu0 = cs.horzcat(v1-v0, v2-v0)
    vc = (v0+v1+v2)/3
    d = cs.vertcat(v0-vc, v1-vc, v2-vc)
    d2 = cs.dot(d, d)
    return xu0 / cs.sqrt(cs.fmax(d2, 1e-12)), d2

v0 = SX.sym('v0', 2)
v1 = SX.sym('v1', 2)
v2 = SX.sym('v2', 2)
vs = cs.vertcat(v0, v1, v2)
xu, size2 = points2mat(v0, v1, v2)
val = -cs.log(cs.det(xu)+1e-12)

#print(cs.jacobian(val, vs))
#print(cs.diag(cs.hessian(val, vs)[0]))

loss = cs.Function(
    'meshgen_trig_loss',
    [vs],
    [val, cs.densify(cs.jacobian(val, vs)), size2]
)
losshess = cs.Function(
    'meshgen_trig_loss_hess',
    [vs],
    [cs.densify(cs.hessian(val, vs)[0])]
)  # seems like it's not positive definite

def fun(v0, v1, v2):
    vs = cs.vertcat(v0, v1, v2)
    val, grad, size2 = loss(vs)
    hess = np.array(losshess(vs))
    #print(np.linalg.eigh(hess)[0])
    #print(np.diag(hess))
    print(np.array(grad)[0])
    return np.array(val)[0], np.array(grad)[0]


np.random.seed(0)
vs = np.random.normal(size=(3, 2))

# verify independence of similar transform
print(fun(vs[0], vs[1], vs[2])[0])
print(fun(vs[1], vs[2], vs[0])[0])
print(fun(vs[2], vs[0], vs[1])[0])
vs *= 1.5
print(fun(vs[1], vs[2], vs[0])[0])
vs = vs @ [[0.6, -0.8], [0.8, 0.6]]
print(fun(vs[1], vs[2], vs[0])[0])

# verify gradient ∝ reciprocal of size
print(np.linalg.norm(fun(vs[0], vs[1], vs[2])[1]))
vs *= 2
print(np.linalg.norm(fun(vs[0], vs[1], vs[2])[1]))

# verify Hessian ∝ reciprocal of size squared
print(np.linalg.norm(losshess(vs.flatten())))
print(np.linalg.norm(losshess(2*vs.flatten())))

# gradient descent:
# (grad / hess) proportional to size
# gradient scaling proportional to size squared


# generate code

sourcefile = 'meshgen_trig_loss.h'
C = cs.CodeGenerator(sourcefile)
C.add(loss)
C.generate()
source = open(sourcefile, "r").read()
source = source.replace("double", "float")
open(sourcefile, "w").write(source)


# test an example result

# optimize

def cost(x):
    x = x.reshape((3, 2))
    return fun(x[0], x[1], x[2])

ax = plt.gca()

def plot_trig(vs):
    vs = vs[[0, 1, 2, 0]]
    ax.plot(vs[:, 0], vs[:, 1])

plot_trig(vs)
optres = scipy.optimize.minimize(cost, vs.reshape(6), jac=True)
vs = optres.x.reshape((3, 2))
print(vs)
print(optres.fun)
plot_trig(vs)
plt.axis("equal")
plt.show()
