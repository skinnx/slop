// (Re)writes game/assets/scenes/Main.scene(+.meta) and assets/scripts/Bootstrap.ts.meta with FIXED uuids.
// Normally never needed again: the files are committed. Kept so the format is documented and reproducible.
// Usage (from tools/): node scripts/gen-scene.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GAME, compressUuid, log } from './lib.mjs';

const SCENE_UUID = '4a24a7dd-af17-483e-8cfa-f17abbcc6392';
const BOOTSTRAP_UUID = '60aebf07-3501-4242-86eb-eae8e528621d';
const W = 720, H = 1280, UI_2D = 1 << 25;
// Deterministic node/component ids so re-running produces identical files.
let n = 0;
const rid = () => crypto.createHash('sha1').update(SCENE_UUID + ':' + n++).digest('base64').replace(/[^A-Za-z0-9+/]/g, '').slice(0, 22);
const v3 = (x, y, z) => ({ __type__: 'cc.Vec3', x, y, z });
const node = (name, parent, children, comps, pos) => ({
  __type__: 'cc.Node', _name: name, _objFlags: 0, _parent: parent, _children: children, _active: true, _components: comps, _prefab: null,
  _lpos: pos, _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 }, _lscale: v3(1, 1, 1), _mobility: 0, _layer: UI_2D, _euler: v3(0, 0, 0), _id: rid(),
});
const objs = [
  /* 0 */ { __type__: 'cc.SceneAsset', _name: 'Main', _objFlags: 0, _native: '', scene: { __id__: 1 } },
  /* 1 */ { __type__: 'cc.Scene', _name: 'Main', _objFlags: 0, _parent: null, _children: [{ __id__: 2 }], _active: true, _components: [], _prefab: { __id__: 13 }, autoReleaseAssets: false, _globals: { __id__: 9 }, _id: SCENE_UUID },
  /* 2 */ node('Canvas', { __id__: 1 }, [{ __id__: 3 }], [{ __id__: 5 }, { __id__: 6 }, { __id__: 7 }, { __id__: 8 }], v3(W / 2, H / 2, 0)),
  /* 3 */ node('Camera', { __id__: 2 }, [], [{ __id__: 4 }], v3(0, 0, 1000)),
  /* 4 */ { __type__: 'cc.Camera', _name: '', _objFlags: 0, node: { __id__: 3 }, _enabled: true, __prefab: null, _projection: 0, _priority: 0, _fov: 45, _fovAxis: 0, _orthoHeight: H / 2, _near: 1, _far: 2000,
    _color: { __type__: 'cc.Color', r: 34, g: 52, b: 40, a: 255 }, _depth: 1, _stencil: 0, _clearFlags: 7, _rect: { __type__: 'cc.Rect', x: 0, y: 0, width: 1, height: 1 },
    _aperture: 19, _shutter: 7, _iso: 0, _screenScale: 1, _visibility: 41943040, _targetTexture: null, _id: rid() },
  /* 5 */ { __type__: 'cc.UITransform', _name: '', _objFlags: 0, node: { __id__: 2 }, _enabled: true, __prefab: null, _contentSize: { __type__: 'cc.Size', width: W, height: H }, _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 }, _id: rid() },
  /* 6 */ { __type__: 'cc.Canvas', _name: '', _objFlags: 0, node: { __id__: 2 }, _enabled: true, __prefab: null, _cameraComponent: { __id__: 4 }, _alignCanvasWithScreen: true, _id: rid() },
  /* 7 */ { __type__: 'cc.Widget', _name: '', _objFlags: 0, node: { __id__: 2 }, _enabled: true, __prefab: null, _alignFlags: 45, _target: null, _left: 0, _right: 0, _top: 0, _bottom: 0,
    _horizontalCenter: 0, _verticalCenter: 0, _isAbsLeft: true, _isAbsRight: true, _isAbsTop: true, _isAbsBottom: true, _isAbsHorizontalCenter: true, _isAbsVerticalCenter: true,
    _originalWidth: 0, _originalHeight: 0, _alignMode: 2, _lockFlags: 0, _id: rid() },
  /* 8 */ { __type__: compressUuid(BOOTSTRAP_UUID), _name: '', _objFlags: 0, node: { __id__: 2 }, _enabled: true, __prefab: null, _id: rid() },
  /* 9 */ { __type__: 'cc.SceneGlobals', ambient: { __id__: 10 }, shadows: { __id__: 11 }, _skybox: { __id__: 12 } },
  /* 10 */ { __type__: 'cc.AmbientInfo' },
  /* 11 */ { __type__: 'cc.ShadowsInfo' },
  /* 12 */ { __type__: 'cc.SkyboxInfo' },
  /* 13 */ { __type__: 'cc.PrefabInfo', fileId: SCENE_UUID },
];
const write = (rel, data) => fs.writeFileSync(path.join(GAME, rel), JSON.stringify(data, null, 2) + '\n');
write('assets/scenes/Main.scene', objs);
write('assets/scenes/Main.scene.meta', { ver: '1.1.50', importer: 'scene', imported: true, uuid: SCENE_UUID, files: ['.json'], subMetas: {}, userData: {} });
write('assets/scripts/Bootstrap.ts.meta', { ver: '4.0.24', importer: 'typescript', imported: true, uuid: BOOTSTRAP_UUID, files: [], subMetas: {}, userData: {} });
log(`Main.scene written; Bootstrap class id in scene = ${compressUuid(BOOTSTRAP_UUID)}`);
