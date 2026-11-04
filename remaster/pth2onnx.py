"""Converte pesos SRVGGNetCompact (Real-ESRGAN) .pth -> .onnx sem PyTorch."""
import sys, zipfile, pickle, collections
import numpy as np, onnx
from onnx import helper, numpy_helper, TensorProto

DT = {'FloatStorage': np.float32, 'HalfStorage': np.float16}

def load_pth(path):
    z = zipfile.ZipFile(path)
    names = z.namelist()
    root = names[0].split('/')[0]
    pkl = [n for n in names if n.endswith('data.pkl')][0]
    class U(pickle.Unpickler):
        def find_class(self, mod, name):
            if mod == 'collections' and name == 'OrderedDict':
                return collections.OrderedDict
            if mod == 'torch._utils' and name == '_rebuild_tensor_v2':
                def rebuild(storage, offset, size, stride, *a):
                    arr = storage
                    if not size:
                        return arr[offset:offset+1].reshape(())
                    it = arr.itemsize
                    return np.lib.stride_tricks.as_strided(arr[offset:], shape=size,
                        strides=[s*it for s in stride]).copy()
                return rebuild
            if mod == 'torch' and name in DT:
                return name
            raise pickle.UnpicklingError(f'bloqueado: {mod}.{name}')
        def persistent_load(self, pid):
            _, stype, key, loc, numel = pid
            raw = z.read(f'{root}/data/{key}')
            return np.frombuffer(raw, dtype=DT[stype]).copy()
    return U(z.open(pkl)).load()

def build(pth, out, scale=4):
    sd = load_pth(pth)
    sd = sd.get('params', sd.get('params_ema', sd))
    idx = sorted({int(k.split('.')[1]) for k in sd})
    nodes, inits = [], []
    x = 'input'
    for i in idx:
        w = sd[f'body.{i}.weight'].astype(np.float32)
        if w.ndim == 4:
            inits += [numpy_helper.from_array(w, f'w{i}'), numpy_helper.from_array(sd[f'body.{i}.bias'].astype(np.float32), f'b{i}')]
            nodes.append(helper.make_node('Conv', [x, f'w{i}', f'b{i}'], [f'c{i}'], pads=[1,1,1,1], kernel_shape=[3,3]))
            x = f'c{i}'
        else:  # PReLU
            inits.append(numpy_helper.from_array(w.reshape(-1,1,1), f'w{i}'))
            nodes.append(helper.make_node('PRelu', [x, f'w{i}'], [f'p{i}']))
            x = f'p{i}'
    nodes.append(helper.make_node('DepthToSpace', [x], ['ps'], blocksize=scale, mode='CRD'))
    inits.append(numpy_helper.from_array(np.array([1,1,scale,scale], np.float32), 'sc'))
    nodes.append(helper.make_node('Resize', ['input', '', 'sc'], ['up'], mode='nearest'))
    nodes.append(helper.make_node('Add', ['ps', 'up'], ['output']))
    g = helper.make_graph(nodes, 'srvgg',
        [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1,3,'h','w'])],
        [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1,3,'H','W'])], inits)
    m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 17)], ir_version=8)
    onnx.checker.check_model(m)
    onnx.save(m, out)
    print(out, 'camadas conv:', sum(n.op_type == 'Conv' for n in nodes))

if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
