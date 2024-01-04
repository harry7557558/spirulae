# generate meshgen_loss_tet.h

import numpy as np
import scipy.optimize
from scipy.spatial.transform import Rotation
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

import casadi as cs
from casadi import SX

def points2mat(v0, v1, v2, v3):
    """returns normalized matrix and size squared"""
    xu0 = cs.horzcat(v1-v0, v2-v0, v3-v0)
    if False:  # det
        det = cs.det(xu0)
        return xu0 * det**(-1/3), det**(2/3)
    else:  # Euclidean
        vc = (v0+v1+v2+v3)/4
        d = cs.vertcat(v0-vc, v1-vc, v2-vc, v3-vc)
        d2 = cs.dot(d, d)
        return xu0 / cs.sqrt(d2), d2

v0 = SX.sym('v0', 3)
v1 = SX.sym('v1', 3)
v2 = SX.sym('v2', 3)
v3 = SX.sym('v3', 3)
vs = cs.vertcat(v0, v1, v2, v3)
xu, size2 = points2mat(v0, v1, v2, v3)
x0 = points2mat(
    SX([0, 0, 0]),
    SX([1, 1, 0]), SX([0, 1, 1]), SX([1, 0, 1])
)[0]
dudx = xu @ cs.inv(x0)
#dudx = x0 @ cs.inv(xu)  # unstable
eps = dudx.T @ dudx - SX.eye(3)
val = cs.dot(eps, eps)
val = -cs.log(cs.det(dudx))
print(float(cs.log(cs.det(x0))))  # -ln(3sqrt(3)/2)
val = -cs.log(cs.det(xu))  # independent of x0 wtf

#print(cs.jacobian(val, vs))
#print(cs.diag(cs.hessian(val, vs)[0]))

loss = cs.Function(
    'meshgen_loss_tet',
    [vs],
    [val, cs.densify(cs.jacobian(val, vs)), size2]
)
losshess = cs.Function(
    'meshgen_loss_tet_hess',
    [vs],
    [cs.densify(cs.hessian(val, vs)[0])]
)  # seems like it's not positive definite

def fun(v0, v1, v2, v3):
    vs = cs.vertcat(v0, v1, v2, v3)
    val, grad, size2 = loss(vs)
    hess = np.array(losshess(vs))
    #print(np.linalg.eigh(hess)[0])
    #print(np.diag(hess))
    print(np.array(grad)[0])
    return np.array(val)[0], np.array(grad)[0]


np.random.seed(3)
vs = np.random.normal(size=(4, 3))

# verify independence of similar transform
print(fun(vs[0], vs[1], vs[2], vs[3])[0])
print(fun(vs[0], vs[2], vs[3], vs[1])[0])
print(fun(vs[1], vs[2], vs[0], vs[3])[0])
vs *= 1.5
print(fun(vs[1], vs[2], vs[0], vs[3])[0])
vs = vs @ Rotation.random().as_matrix()
print(fun(vs[1], vs[2], vs[0], vs[3])[0])

# verify gradient ∝ reciprocal of size
print(np.linalg.norm(fun(vs[0], vs[1], vs[2], vs[3])[1]))
vs *= 2
print(np.linalg.norm(fun(vs[0], vs[1], vs[2], vs[3])[1]))

# verify Hessian ∝ reciprocal of size squared
print(np.linalg.norm(losshess(vs.flatten())))
print(np.linalg.norm(losshess(2*vs.flatten())))

# gradient descent:
# (grad / hess) proportional to size
# gradient scaling proportional to size squared


# generate code

sourcefile = 'meshgen_loss_tet.h'
C = cs.CodeGenerator(sourcefile)
C.add(loss)
C.generate()
source = open(sourcefile, "r").read()
source = source.replace("double", "float")
open(sourcefile, "w").write(source)


# test an example result

# optimize

def cost(x):
    x = x.reshape((4, 3))
    return fun(x[0], x[1], x[2], x[3])

ax = plt.gca(projection='3d')

def plot_tet(vs):
    vs = vs[[0, 1, 2, 0, 3, 1, 2, 3]]
    ax.plot(vs[:, 0], vs[:, 1], vs[:, 2])

plot_tet(vs)
optres = scipy.optimize.minimize(cost, vs.reshape(12), jac=True)
vs = optres.x.reshape((4, 3))
print(vs)
print(optres.fun)
plot_tet(vs)

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
