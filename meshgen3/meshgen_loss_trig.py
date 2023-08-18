# generate meshgen_loss_trig.h

import numpy as np
import scipy.optimize
from scipy.spatial.transform import Rotation
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

import casadi as cs
from casadi import SX

def points2mat(v0, v1, v2):
    """returns normalized matrix and size squared"""
    xu0 = cs.horzcat(v1-v0, v2-v0)
    vc = (v0+v1+v2)/3
    d = cs.vertcat(v0-vc, v1-vc, v2-vc)
    d2 = cs.dot(d, d)
    return xu0 / cs.sqrt(d2), d2

v0 = SX.sym('v0', 3)
v1 = SX.sym('v1', 3)
v2 = SX.sym('v2', 3)
vs = cs.vertcat(v0, v1, v2)
xu, size2 = points2mat(v0, v1, v2)
n = cs.cross(xu[:, 0], xu[:, 1])
val = -cs.log(cs.dot(n, n))

jac = cs.jacobian(val, vs)
hess = cs.jacobian(jac, vs)

#print(jac)
#print(cs.diag(hess))

loss = cs.Function(
    'meshgen_loss_trig',
    [vs],
    [val, cs.densify(jac), size2]
)
losshess = cs.Function(
    'meshgen_loss_trig_hess',
    [vs],
    [cs.densify(hess)]
)  # seems like it's not positive definite

def fun(v0, v1, v2):
    vs = cs.vertcat(v0, v1, v2)
    val, grad, size2 = loss(vs)
    hess_ = np.array(losshess(vs))
    #print(np.linalg.eigh(hess_)[0])
    #print(np.diag(hess_))
    # print(np.array(grad)[0])
    return np.array(val)[0], np.array(grad)[0]


np.random.seed(3)
vs = np.random.normal(size=(3, 3))

# verify independence of similar transform
print(fun(vs[0], vs[1], vs[2])[0])
print(fun(vs[0], vs[2], vs[1])[0])
print(fun(vs[1], vs[2], vs[0])[0])
vs *= 1.5
print(fun(vs[1], vs[2], vs[0])[0])
vs = vs @ Rotation.random().as_matrix()
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

sourcefile = 'meshgen_loss_trig.h'
C = cs.CodeGenerator(sourcefile)
C.add(loss)
C.generate()
source = open(sourcefile, "r").read()
source = source.replace("double", "float")
open(sourcefile, "w").write(source)


# test an example result

# optimize

def cost(x):
    x = x.reshape((3, 3))
    return fun(x[0], x[1], x[2])

ax = plt.gca(projection='3d')

def plot_trig(vs):
    vs = vs[[0, 1, 2, 0]]
    ax.plot(vs[:, 0], vs[:, 1], vs[:, 2])

plot_trig(vs)
optres = scipy.optimize.minimize(cost, vs.reshape(9), jac=True)
vs = optres.x.reshape((3, 3))
print(vs)
print(optres.fun)
plot_trig(vs)

# plot

from mpl_toolkits.mplot3d import Axes3D
limits = np.array([
    ax.get_xlim3d(),
    ax.get_ylim3d(),
    ax.get_zlim3d(),
])
center = np.mean(limits, axis=1)
radius = 0.5 * np.max(np.abs(limits[:, 1] - limits[:, 0]))
ax.set_xlim3d([center[0] - radius, center[0] + radius])
ax.set_ylim3d([center[1] - radius, center[1] + radius])
ax.set_zlim3d([center[2] - 0.8*radius, center[2] + 0.8*radius])
plt.show()
