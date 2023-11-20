import torch
import numpy as np
import json

class Model(torch.nn.Module):
    pass

model = torch.load('../../Graphics/image/denoise/data_spirulae_2/model1.pth',
                   map_location=torch.device('cpu'))

state_dict = model.state_dict()

info = {
    'dtype': 'int16',
    'state_dict': {}
}
data = np.array([], dtype=np.int16)

for key, tensor in state_dict.items():
    tensor = tensor.detach().cpu().numpy()
    amin, amax = np.amin(tensor), np.amax(tensor)
    vmin, vmax = -32768+0.1, 32767-0.1
    m = (amax-amin) / (vmax-vmin)
    b = amin - m * vmin
    item = {
        'shape': [*tensor.shape],
        'm': m,
        'b': b,
        'offset': len(data)
    }
    data_ = np.round((tensor.reshape(-1)-b)/m).astype(np.int16)
    info['state_dict'][key] = item
    data = np.concatenate((data, data_))
    print(key, tensor.shape, (amin, amax), sep='\t')

with open("denoise_1_index.json", 'w') as fp:
    json.dump(info, fp)
data.tofile("denoise_1_params.bin")
