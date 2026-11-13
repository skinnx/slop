# tools/ — bộ công cụ kiểm chứng trên Linux

Thư mục này cho phép kiểm chứng project Cocos Creator 3.8.8 trong `../game` mà **không cần editor**:

- type-check code game với đúng `cc.d.ts` của engine 3.8.8,
- chạy test của phần lõi (`game/assets/scripts/core`),
- chạy **code game thật và `Main.scene` thật** trên **engine 3.8.8 thật** trong Chromium, điều khiển bằng chạm, chụp ảnh, đọc số draw call.

Editor (Windows/macOS) vẫn là nơi duy nhất build bản phát hành. Xem `docs/tech/cocos-3.8-guide.md`.

## 1. Cài đặt (một lệnh)

Yêu cầu: Node 22+, git, curl, mạng tới `github.com`, `raw.githubusercontent.com`, `registry.npmjs.org`. Chromium cho Playwright: container cloud đã có sẵn ở `/opt/pw-browsers` (biến `PLAYWRIGHT_BROWSERS_PATH`).

```bash
cd tools
npm run setup
```

Lệnh này làm từ đầu, theo thứ tự:

1. `npm ci` cho `tools/` (phiên bản ghim trong `package-lock.json`).
2. Clone engine `cocos/cocos-engine` tag `3.8.8` vào `tools/.cache/cocos-engine`, kiểm tra đúng commit ghim trong `pins.json`.
3. `npm ci --ignore-scripts` trong engine.
4. Clone thưa (sparse) phần `emscripten` của `cocos-engine-external` tag `v3.8.8-2` (cần cho file khai báo).
5. Build `cc.d.ts` (`npm run build:declaration` của engine).
6. Build engine thành **một file ESM** `tools/.cache/engine-web/cc.js` (feature liệt kê trong `pins.json`).
7. Tải `shdc-lib.js` (trình biên dịch shader, MIT, repo chính thức `cocos/cocos-cli`, commit và sha256 ghim) rồi biên dịch các effect 2D builtin trong Chromium → `builtin-2d-effects.json`.
8. Sinh `game/temp/tsconfig.cocos.json` và `game/temp/declarations/*` giống editor.

Chạy lại an toàn: bước đã xong thì bỏ qua (dấu ở `tools/.cache/stamps/`). Muốn làm lại một bước: xóa file dấu của bước đó. Muốn làm lại tất cả: xóa `tools/.cache`.

Số đo (từ bản clone sạch trong container cloud, 2026-11-13):

| | Giá trị |
|---|---|
| Thời gian lần đầu | 72–79 s (79 s với npm cache rỗng) |
| Chạy lại | 1–2 s |
| Đĩa | `tools/.cache` 724 MB (engine 720 MB) + `tools/node_modules` 77 MB + `game/temp` 3.3 MB + npm cache ~90 MB |

Không có gì trong đó được commit (`tools/.gitignore`, `game/.gitignore`).

Nếu một lượt tải bị chặn, setup dừng và in gợi ý. Trong container cloud: đọc `/root/.ccr/README.md`, chạy `curl -sS "$HTTPS_PROXY/__agentproxy/status"`. Lỗi 403/407 là bị chặn theo chính sách: báo lại, **không tìm cách vượt**.

## 2. Lệnh hằng ngày (trong `tools/`)

| Lệnh | Việc |
|---|---|
| `npm run typecheck` | `tsc` cho `game/` (cấu hình giống editor) rồi cho `tools/` (harness, test) |
| `npm test` | vitest: test trong `tools/tests/**/*.test.ts` |
| `npm run harness -- <kịch-bản.mjs> [--out <thư-mục>] [--viewport 540x960] [--verbose]` | Chạy một kịch bản trên engine thật. Ảnh + `summary.json` vào `--out` (mặc định `tools/.out/<tên>/`) |
| `npm run drawcalls` | Khởi động game, chụp 1 ảnh, in số draw call |
| `npm run atlas` | Đóng gói ảnh từ `art-source/` thành atlas trong `game/assets/resources/textures/` |
| `npm run check` | typecheck + test + kịch bản mẫu |

Mã thoát khác 0 nghĩa là thất bại. Khi kịch bản lỗi, harness vẫn chụp `FAILED.png`.

## 3. Viết kịch bản chơi thử

Kịch bản là một file `.mjs` xuất một hàm `async (h) => {}`. Mẫu: `harness/scenarios/example.mjs`. Đặt kịch bản mới trong `harness/scenarios/`.

**Hệ tọa độ:** tọa độ thiết kế/UI của Cocos, 720 × 1280, **gốc ở góc dưới-trái, y hướng lên**. Đây đúng là giá trị code game nhận từ `EventTouch.getUILocation()`. Harness tự đổi sang pixel trang; đã kiểm chứng khớp ±0 px ở các viewport 540×960, 412×915, 600×800, 360×640.

API của `h`:

| Hàm | Ý nghĩa |
|---|---|
| `await h.waitForGlobal('__bootstrapReady')` | Chờ một biến toàn cục truthy. `Bootstrap` đặt `__bootstrapReady` khi dựng xong |
| `await h.wait(ms)`, `await h.frames(n)` | Chờ thời gian / chờ n frame |
| `await h.tap(x, y, { id = 9 })` | Chạm nhanh |
| `await h.drag([x0,y0], [x1,y1], { id = 0, steps = 10, stepMs = 16, holdMs = 0, keepDown = false })` | Kéo kiểu joystick. `keepDown: true` để giữ ngón |
| `await h.touchDown(id, x, y)`, `h.touchMove(id, x, y)`, `h.touchUp(id)` | Điều khiển từng ngón (đa điểm: joystick ngón 0 + skill ngón 1) |
| `await h.touches()`, `h.clearTouches()` | Danh sách chạm mà game đã nhận `{id, x, y, type}` (tọa độ UI) |
| `await h.stats()` | `{ drawCalls, tris, instances, frames }` của frame cuối |
| `await h.screenshot('ten')` | Lưu `<out>/ten.png`, trả về đường dẫn |
| `h.note('...')` | Ghi một dòng vào tóm tắt |
| `h.assert(điều_kiện, 'mô tả')` | Sai thì kịch bản thất bại |
| `await h.eval(fn, arg)`, `h.page` | Chạy code trong trang / truy cập Playwright trực tiếp |

Ví dụ ngắn:

```js
export default async function (h) {
  await h.waitForGlobal('__bootstrapReady');
  await h.drag([180, 300], [300, 420], { keepDown: true }); // joystick, giữ ngón 0
  await h.tap(560, 260, { id: 1 });                          // bấm skill bằng ngón 1
  await h.touchUp(0);
  await h.screenshot('sau-khi-bam');
  const s = await h.stats();
  h.assert(s.drawCalls <= 20, `draw calls = ${s.drawCalls}`);
}
```

Muốn kịch bản đọc trạng thái game: cho game ghi một đối tượng chỉ để debug lên `globalThis` (ví dụ `globalThis.__game = { floor, enemies }`) rồi đọc bằng `h.eval(() => globalThis.__game)`. Đừng để kịch bản phụ thuộc vào cấu trúc node.

Lưu ảnh làm bằng chứng cột mốc: `npm run harness -- harness/scenarios/<x>.mjs --out ../docs/evidence/m1/<x>`.

## 4. Test phần lõi

- Viết test trong `tools/tests/` (ví dụ `tools/tests/core/combat.test.ts`), import từ `../../game/assets/scripts/core/...` **không ghi đuôi `.ts`** (Cocos cấm đuôi `.ts`; vitest chấp nhận không đuôi).
- Không dùng `node --test` thuần: Node strip-types đòi đuôi `.ts` và không hiểu parameter property.
- `tests/core-purity.test.ts` chặn trong `core/`: import `cc`, `window`/`document`/`localStorage`, `Math.random`, `const enum`, import có đuôi `.ts`.
- `tests/resources.test.ts`: mọi JSON trong `resources` parse được; atlas khớp ảnh; không có tên file chứa dấu cách.
- `tests/scene-wiring.test.ts`: `Main.scene` tham chiếu `Bootstrap` đúng uuid; uuid cố định không đổi.

## 5. Ảnh từ `art-source/` vào game

Quy trình (đã kiểm chứng trong harness; ảnh `02-drag-held.png` cho thấy sprite 16 px phóng 4× sắc nét):

1. Thêm file vào `atlas/atlases.json` (thư mục nguồn, tiền tố tên, danh sách file).
2. `npm run atlas` → `game/assets/resources/textures/<tên>.png` + `<tên>-frames.json`. Có padding 2 px và kéo dài mép (extrude) 1 px, để lấy mẫu NEAREST không dính ô bên cạnh. Kết quả tất định; commit cả hai file.
3. Trong game: `const frames = await loadPixelAtlas(getLoader(), 'textures/<tên>')` (trong `game/assets/scripts/AssetLoader.ts`), rồi `sprite.spriteFrame = frames.get('dungeon/tile_0084')`.

Vì sao làm vậy:

- **Một texture cho cả atlas** → sprite batch được, kể cả trên Android, nơi dynamic atlas bị tắt mặc định.
- **Lọc NEAREST, không mipmap, đặt bằng code** (`setFilters`, `setMipFilter`) → sắc nét, và không phụ thuộc cài đặt import trong `.meta` của editor (code nạp `ImageAsset` rồi tự tạo `Texture2D`).
- **`spriteFrame.packable = false`** → dynamic atlas trên web không chép frame sang texture chung lọc LINEAR (sẽ bị nhòe).
- **Đặt `texture` + `rect` + `originalSize` cùng lúc** bằng `SpriteFrame.reset(...)`. Chỉ đặt `rect` thì `originalSize` vẫn bằng cả atlas, và `SizeMode.RAW` vẽ frame to bằng atlas (đã gặp và sửa).
- Phóng to bằng `node.setScale(k)` với k nguyên (16 px × 4 = 64 đơn vị thiết kế). Màn hình thật thường có hệ số thiết kế→pixel không nguyên (ví dụ 720 → 1080 px là 1.5×), nên vài cột pixel sẽ rộng hơn cột khác. Đây là giới hạn chung của pixel art; chấp nhận cho asset tạm.
- Đừng đặt PNG lẻ chưa đóng gói vào `resources/` rồi dùng trực tiếp với nhiều sprite: mỗi PNG là một texture, vỡ batch.

## 6. Harness khác bản build của editor ở đâu

Harness chạy đúng **code game** (`game/assets/scripts/**`, mọi file `.ts` đều được nạp như editor) và **đúng `Main.scene`**. Chỉ thay hai thứ: phần khởi động engine (`harness/boot/harness-boot.ts`) và `AssetLoader` (đọc file bằng `fetch` thay vì `resources`). Những chỗ có thể khác:

1. **Biên dịch script:** harness dùng esbuild (TypeScript 5, `useDefineForClassFields: true`, decorator kiểu cũ). Editor dùng Babel với tập con TS ~4.1 và **bỏ qua lỗi type**. Cú pháp mới chạy ở harness có thể lỗi trong editor; `npm run typecheck` và các quy tắc trong guide giảm rủi ro này.
2. **Đăng ký class:** editor đăng ký class theo uuid của `.meta` (`_RF.push`). Harness bắt chước bằng `js.setClassAlias` cho class có tên trùng tên file. Script chưa có `.meta` (file mới, editor chưa mở) vẫn chạy nhưng không có alias; điều này không sao vì scene chỉ tham chiếu `Bootstrap`.
3. **Không có `settings.json` và Project Settings:** design resolution lấy từ lời gọi trong `Bootstrap.onLoad`; sorting layer, layer tùy chỉnh, physics, macro trong Project Settings **không áp dụng** trong harness.
4. **Không có bundle `resources`/`internal`:** gọi `resources.load` trực tiếp trong code game sẽ hỏng trong harness. Luôn đi qua `AssetLoader`. Cài đặt import trong `.meta` (kiểu ảnh, filter, nén) bị bỏ qua trong harness.
5. **Shader:** effect builtin do `shdc-lib` của cocos-cli biên dịch, không phải editor. Chỉ có `builtin-sprite`, `builtin-graphics`, `builtin-clear-stencil`, `builtin-unlit`. Thứ cần effect khác (profiler/`showFPS`, particle, spine, material tùy chỉnh) sẽ lỗi hoặc hiện màu "missing" cho tới khi thêm effect vào `pins.json`.
6. **Feature engine** cố định trong `pins.json`. Editor dùng Feature Cropping của project. Nếu game dùng module chưa có trong danh sách (ví dụ `physics-2d-builtin`), thêm vào `pins.json` rồi chạy lại setup.
7. **Đồ họa:** Chromium desktop + SwiftShader (WebGL phần mềm). FPS không có ý nghĩa cho điện thoại. Tin số draw call và tính đúng, không tin FPS.
8. **Native (Android) không được mô phỏng:** dynamic atlas tắt, `sys.localStorage` dùng sqlite, khác font hệ thống.
9. **Âm thanh:** `AssetLoader` chưa có hàm nạp audio; harness chưa kiểm chứng âm thanh. Khi cần, thêm `audio(path)` vào interface và cả hai bản cài đặt.
10. **Chạm** là sự kiện CDP tổng hợp; chưa thử chuột.

## 7. Xử lý sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| `Missing .../cc.js. Run "npm run setup"` | Chạy `npm run setup` |
| `Cannot start Chromium` | Kiểm tra `PLAYWRIGHT_BROWSERS_PATH`; phiên bản `playwright-core` ghim là 1.63.0 (Chromium build 1243) |
| `tag 3.8.8 is at ..., expected ...` | Tag trên GitHub bị đổi. Dừng lại, báo trưởng kỹ thuật |
| `Harness boot failed` | Xem `summary.json` → `console`; thường là lỗi trong `Bootstrap` hoặc thiếu file trong `resources` |
| Sprite màu tím/vàng | Material "missing": thiếu effect. Xem mục 6.5 |
| Sprite to bất thường | SpriteFrame tạo tay thiếu `originalSize` (dùng `loadPixelAtlas`) |
| Chạm lệch | Trang phải có `<meta name="viewport" ...>` (đã có trong `harness/page/index.html`) |
| `npm run typecheck`: lỗi trong `cc.d.ts` | Thiếu `skipLibCheck: true` trong `game/tsconfig.json` |
| Editor ghi đè `game/temp/` | Bình thường. `npm run setup` (vài giây) sinh lại |

## 8. Cấu trúc

```
tools/
  package.json, package-lock.json   phiên bản ghim
  pins.json                          engine/tag/commit, shdc url+sha256, feature engine, effect
  scripts/setup.mjs                  lệnh setup
  scripts/build-engine-web.cjs       engine -> cc.js (ESM)
  scripts/gen-declarations.cjs       game/temp như editor
  scripts/effects/                   biên dịch effect trong Chromium
  scripts/pack-atlas.mjs             atlas từ art-source
  scripts/gen-scene.mjs              tài liệu hóa/sinh lại Main.scene + .meta (uuid cố định)
  scripts/typecheck.mjs
  atlas/atlases.json                 cấu hình atlas
  harness/page/index.html            trang
  harness/boot/                      khởi động engine + nạp code game + scene
  harness/lib/                       server, Chromium, bundle, API kịch bản
  harness/scenarios/                 kịch bản (example.mjs, stats.mjs)
  tests/                             vitest
  .cache/ .out/ node_modules/        sinh ra, không commit
```

Đổi phiên bản engine: sửa `pins.json` (tag + commit + tag external), xóa `tools/.cache`, chạy `npm run setup`. Chỉ làm khi trưởng kỹ thuật quyết định.
