import torch
import numpy as np
import json

class Model(torch.nn.Module):
    pass

model = torch.load(
    '../../Graphics/image/denoise/data_spirulae_4/model6_6.pth',
    map_location=torch.device('cpu'))

state_dict = model.state_dict()

nbit = 8
dtype = getattr(np, f'int{nbit}')
info = {
    'dtype': f'int{nbit}',
    'state_dict': {}
}
data = np.array([], dtype=dtype)

for key, tensor in state_dict.items():
    tensor = tensor.detach().cpu().numpy()
    amin, amax = np.amin(tensor), np.amax(tensor)
    vmin, vmax = -2**(nbit-1)+0.1, 2**(nbit-1)-1.1
    m = (amax-amin) / (vmax-vmin)
    b = amin - m * vmin
    item = {
        'shape': [*tensor.shape],
        'm': m,
        'b': b,
        'offset': len(data)
    }
    data_ = np.round((tensor.reshape(-1)-b)/m).astype(dtype)
    info['state_dict'][key] = item
    data = np.concatenate((data, data_))
    print(key, tensor.shape, (amin, amax), sep='\t')

name = "runet2gan2"
with open(f"denoise_models/denoise_{name}.json", 'w') as fp:
    json.dump(info, fp)
data.tofile(f"denoise_models/denoise_{name}.bin")
