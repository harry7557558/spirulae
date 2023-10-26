# generate ec_loss_trig.h

import numpy as np
import scipy.optimize
from scipy.spatial.transform import Rotation
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

import casadi as cs
from casadi import SX

def angle(a, b):
    n = cs.cross(a, b)
    s = cs.dot(n, n) / (cs.dot(a, a) * cs.dot(b, b))
    return -cs.log(s)

v0 = SX.sym('v0', 3)
v1 = SX.sym('v1', 3)
v2 = SX.sym('v2', 3)
vs = cs.vertcat(v0, v1, v2)
val = (angle(v1-v0,v2-v0) + angle(v2-v1,v0-v1) + angle(v0-v2,v1-v2)) / 6

jac = cs.jacobian(val, v0)
hess = cs.jacobian(jac, v0)

#print(jac)
#print(cs.diag(hess))

loss = cs.Function(
    'ec_loss_trig',
    [vs],
    [val]
)
lossgh = cs.Function(
    'ec_loss_trig_gh',
    [vs],
    [cs.densify(jac), cs.densify(hess)]
)

def fun(v0, v1, v2):
    vs = cs.vertcat(v0, v1, v2)
    val = loss(vs)
    grad, hess = lossgh(vs)
    return np.array(val)[0], np.array(grad)[0]


np.random.seed(3)
vs = np.random.normal(size=(3, 3))


# generate code

sourcefile = 'ec_loss_trig.h'
C = cs.CodeGenerator(sourcefile)
C.add(loss)
C.add(lossgh)
C.generate()
source = open(sourcefile, "r").read()
source = source.replace("double", "float")
open(sourcefile, "w").write(source)


# test an example result

# optimize

def cost(x):
    return fun(x, vs[1], vs[2])

ax = plt.gca(projection='3d')

def plot_trig(vs):
    vs = vs[[0, 1, 2, 0]]
    ax.plot(vs[:, 0], vs[:, 1], vs[:, 2])

plot_trig(vs)
optres = scipy.optimize.minimize(cost, vs[0], jac=True)
vs[0] = optres.x
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
