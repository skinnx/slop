# Hướng dẫn kỹ thuật Cocos Creator 3.8.x cho dự án

Tài liệu này dành cho agent lập trình. Đọc xong là làm được, không cần đọc thêm tài liệu khác.
Ngày nghiên cứu: 2026-11-13. Người viết: tech lead (agent nghiên cứu).

## Ký hiệu nguồn

Mỗi khẳng định có một nhãn:

- **[TN]** = đã kiểm chứng bằng thí nghiệm trong container Linux này (có lệnh và kết quả ở mục 8).
- **[DOC]** = tài liệu chính thức nói vậy (có link).
- **[CĐ]** = báo cáo cộng đồng (forum, issue), có link.
- **[SL]** = suy luận của tôi, chưa kiểm chứng.

Thư mục thí nghiệm (gọi tắt là `$R` trong tài liệu này):
`/tmp/claude-0/-home-user-slop/58b8dc59-e543-58a3-b5a2-f1ae221258e1/scratchpad/cocos-research/`

---

## 0. Tóm tắt quyết định

1. **Phiên bản: Cocos Creator 3.8.8.** Đây là bản 3.8.x ổn định mới nhất trên trang download chính thức (16/12/2025) [DOC: https://www.cocos.com/en/creator-download]. Engine có tag `3.8.8` và `v3.8.8` trên GitHub [TN: `git ls-remote`]. Có nhánh `v3.8.9` nhưng chưa có tag và chưa có trên trang download [TN]. Không dùng Cocos 4: mới ở `4.0.0-beta.2` [TN: tag repo `cocos/cocos4`].
2. **Editor chỉ chạy trên Windows/macOS. Không có cách build bản chính thức trên Linux ở đây.** Wine không có trong apt, `download.cocos.com` bị reset kết nối, `cocos-cli` chỉ nhắm Cocos 4 [TN]. Bản build để giao hàng (web-mobile, Android) **chỉ do product owner làm** trong editor (hoặc bằng dòng lệnh của editor trên máy owner).
3. **Nhưng agent trên Linux kiểm chứng được nhiều hơn dự kiến** [TN]:
   - Type-check toàn bộ code view với **đúng file `cc.d.ts` mà editor dùng**, tự build từ source engine 3.8.8.
   - Unit test phần lõi (không import `cc`) bằng vitest hoặc tsx dưới Node 22.
   - **Harness trình duyệt chạy engine 3.8.8 thật** (build từ source thành 1 file ESM `cc.js`), render WebGL trong Chromium headless, chụp screenshot bằng Playwright. Đã chạy được: Sprite, Graphics, Label, 400 sprite 1 draw call, Sorting2D, multi-touch, và **chính file scene + script của project skeleton**.
4. **Kiến trúc: code-first.** Một scene `Main.scene` duy nhất, trên Canvas chỉ có một component `Bootstrap`. Mọi node, sprite, UI, lưới iso tạo bằng TypeScript lúc chạy. Asset nạp từ `assets/resources/` theo đường dẫn, qua một lớp `AssetLoader` có thể thay thế. Luật chơi nằm trong `scripts/core/` không import `cc`. Số liệu nằm trong JSON.
5. **Không cần agent viết `.meta` cho asset mới.** Editor tự sinh khi mở project [DOC]. Ngoại lệ duy nhất: `Main.scene` và `Bootstrap.ts` có `.meta` viết tay với uuid cố định, vì scene tham chiếu script bằng uuid [TN: harness đọc đúng scene đó]. Sau lần mở đầu tiên, owner commit lại mọi `.meta` editor sinh ra.
6. **Phân vai kiểm chứng:**

| Việc | Agent trên Linux | Owner trong editor |
|---|---|---|
| Type-check code view với `cc.d.ts` 3.8.8 | Có [TN] | — |
| Unit test / mô phỏng lõi | Có [TN] | — |
| Chạy view trên engine thật, screenshot, đếm draw call | Có, qua harness [TN] | — |
| Kiểm tra input touch/joystick | Có, qua CDP touch [TN] | Thử trên điện thoại |
| Project mở được trong editor, không lỗi import | Không | Có |
| Preview trong editor, build web-mobile/Android | Không | Có |
| Chạy bản build web-mobile do owner gửi về | Có (serve + Playwright) [SL] | — |
| Hiệu năng thật trên điện thoại | Không (SwiftShader không đại diện) | Có |

---

## 1. Bố cục repo đề xuất

```
/ (repo)
  docs/
  game/                         <- project Cocos (mở thư mục này bằng Dashboard)
    package.json                <- { name, uuid, creator.version: "3.8.8" }
    tsconfig.json               <- extends ./temp/tsconfig.cocos.json
    .gitignore                  <- library/ temp/ local/ build/ profiles/ native/ node_modules/
    settings/                   <- editor sinh ra; COMMIT
    assets/
      scenes/Main.scene(.meta)  <- viết tay 1 lần, uuid cố định
      scripts/
        core/                   <- luật chơi. CẤM import 'cc'
        view/                   <- component Cocos, Bootstrap, AssetLoader
      resources/                <- mọi thứ nạp động theo path
        data/*.json
        textures/*.png (+ atlas json)
        audio/*
  tools/                        <- KHÔNG nằm trong game/assets
    package.json                <- vitest, tsx, esbuild, typescript
    engine/                     <- script build cc.js + cc.d.ts từ engine 3.8.8 (output gitignore)
    harness/                    <- trang HTML, harness-boot.ts, runner Playwright
    tests/                      <- test cho game/assets/scripts/core
```

Lý do:
- Editor chỉ quét `assets/` [DOC: https://docs.cocos.com/creator/3.8/manual/en/getting-started/project-structure/]. Code test, harness, `node_modules` của tool phải nằm ngoài `assets/`, nếu không editor sẽ import và compile chúng [SL].
- Commit `assets` (kể cả `.meta`), `settings`, `package.json`, `extensions` [DOC: project-structure]. Không commit `library`, `temp`, `local`, `build` [DOC: cùng trang].
- Đặt tool trong `tools/` riêng, có `package.json` riêng, để không đụng `game/package.json` mà editor quản lý [SL].

---

## 2. Kiến trúc (đánh giá kế hoạch cũ và cải tiến)

Kế hoạch cũ: lõi TypeScript không phụ thuộc engine, chạy dưới Node; lớp view Cocos mỏng; dữ liệu JSON. **Giữ nguyên hướng này.** Bổ sung các điểm sau.

### 2.1 Lõi (`scripts/core/`)
- Không import `cc`, không dùng `window`, `document`, `setTimeout` của trình duyệt. Chỉ TypeScript thuần [SL].
- Bước mô phỏng cố định (fixed step, ví dụ 1/30 s). View gọi `world.step()` từ `update(dt)` với accumulator [SL].
- RNG có seed, tự viết. Không dùng `Math.random()` trong lõi. Lý do: test tái lập được [TN: test "deterministic with same seed" pass].
- Va chạm: hình tròn và lưới (spatial hash) tự viết trong lõi. **Không dùng physics engine của Cocos cho đám đông 100+ quái** [SL]. Lý do: physics 2D tạo thêm component và callback trên mỗi node; với va chạm tròn đơn giản thì lưới băm nhanh hơn và test được dưới Node.
- Import giữa các file lõi **không ghi đuôi `.ts`** (ví dụ `'./sim'`). Cocos cấm đuôi `.ts` trong specifier [DOC: https://docs.cocos.com/creator/3.8/manual/en/scripting/modules/spec.html].
- Hệ quả: **không chạy test bằng `node --test` thuần** (Node strip-types cần đuôi `.ts` và không hỗ trợ parameter property) [TN: lỗi `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`]. Dùng **vitest** hoặc **tsx** [TN: cả hai pass].
- Tránh cú pháp Cocos không hỗ trợ: `const enum`, `export =`/`import =`, re-export type không có `export type`, `var`/`let` trong namespace [DOC: https://docs.cocos.com/creator/3.8/manual/en/scripting/language-support.html]. Khuyên: dùng `enum` thường hoặc union string; không dùng namespace.
- Lõi xuất ra "state" dạng dữ liệu (mảng đơn vị, vị trí, hp, trạng thái) và nhận "command" (hướng joystick, kích hoạt skill). View không sửa state trực tiếp.

### 2.2 View (`scripts/view/`)
- `Bootstrap` (component duy nhất trong scene) tạo mọi thứ khác. Các component khác được `addComponent` bằng code.
- Một **manager** cập nhật tất cả sprite quái trong một vòng lặp `update`, thay vì mỗi quái một component có `update` riêng [SL; harness dùng cách này cho skeleton, 120 node, 2 draw call TN].
- Nạp asset chỉ qua `AssetLoader` (xem `$R/skeleton/assets/scripts/view/AssetLoader.ts`). Bản mặc định dùng `resources.load`. Harness thay bằng bản dùng `fetch`/`assetManager.loadRemote` [TN].
- Tạo SpriteFrame bằng code từ `ImageAsset` (`SpriteFrame.createWithImage`) hoặc từ một texture atlas + rect. Cách này **không phụ thuộc kiểu import ảnh trong `.meta`** (mặc định là `texture`, không có sub-asset `spriteFrame`) [DOC: https://docs.cocos.com/creator/3.8/manual/en/asset/image.html; TN: render đúng].

### 2.3 Dữ liệu
- JSON trong `assets/resources/data/`. Runtime nạp bằng `resources.load(path, JsonAsset)` (path không đuôi) [DOC: https://docs.cocos.com/creator/3.8/manual/en/asset/dynamic-load-resources.html].
- Test dưới Node đọc cùng file đó bằng `fs`. Viết validator schema trong lõi và chạy trong test [SL].

### 2.4 Render thế giới iso
- **Khuyên dùng lưới iso tự viết**, không dùng TiledMap cho lưới xây dựng [SL]. Lý do: công trình đặt/nâng cấp tự do, cần sort theo chiều sâu, cần map tọa độ ô ↔ màn hình trong lõi để test. TiledMap hỗ trợ ORTHO/HEX/ISO [TN: enum trong source 3.8.8] nhưng là bản đồ tĩnh từ file `.tmx` do editor import; tạo TiledMap từ code không được docs mô tả [DOC: https://docs.cocos.com/creator/3.8/manual/en/editor/components/tiledmap.html].
- Có thể dùng TiledMap cho nền tĩnh sau này nếu muốn vẽ map bằng Tiled. Khi đó `.tmx` và `.tsx` phải cùng thư mục [DOC: trang tiledmap]. TiledMap không gộp batch với sprite khác, có batch riêng [DOC: https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/engine/ui-batch.html].
- Sort chiều sâu: dùng **Sorting2D** (`sortingOrder` = hàm của y) [TN: thứ tự vẽ đảo đúng khi đặt sortingOrder] hoặc `setSiblingIndex`. Sorting2D phải bật module "2D Rendering Sorting" trong Project Settings → Feature Cropping [DOC: https://docs.cocos.com/creator/3.8/manual/en/engine/rendering/sorting-2d.html]. Có báo cáo thay đổi hành vi liên quan USE_SORTING_2D ở 3.8.7 [CĐ: https://forum.cocos.org/t/topic/170218].

---

## 3. Project 3.8 trên đĩa (câu hỏi 1)

### 3.1 File bắt buộc và file editor tự sinh

| Đường dẫn | Ai tạo | Commit? | Ghi chú |
|---|---|---|---|
| `package.json` | Viết tay được | Có | Cùng `assets/` đánh dấu thư mục là project [DOC: project-structure] |
| `assets/` | Viết tay | Có | Chỉ nội dung ở đây hiện trong Assets panel [DOC] |
| `*.meta` | Editor sinh khi thiếu [DOC: https://docs.cocos.com/creator/3.8/manual/en/asset/meta.html] | Có | Chứa uuid |
| `settings/` (`settings/v2/packages/*.json`) | Editor | Có | Design resolution, layer, module... [TN: thấy trong project mẫu chính thức] |
| `tsconfig.json` | Editor sinh khi tạo project mới [DOC: https://docs.cocos.com/creator/3.8/manual/en/scripting/tsconfig.html]; viết tay được | Có | Chỉ cho IDE; editor **không đọc** khi compile [DOC: language-support] |
| `temp/tsconfig.cocos.json`, `temp/declarations/*.d.ts` | Editor | Không | Ta tự sinh được trên Linux [TN] |
| `library/`, `local/`, `build/`, `profiles/` | Editor | Không | [DOC: project-structure] |

`package.json` tối thiểu (dùng trong skeleton):
```json
{
  "name": "slop-skeleton",
  "uuid": "709abd13-00bd-4104-9dbb-a992afd4b70b",
  "type": "2d",
  "creator": { "version": "3.8.8" }
}
```
Các trường này lấy theo project chính thức `cocos/cocos-test-projects` nhánh `v3.8.8` (có `name`, `type`, `uuid`, `version`, `creator.version`) và fixture của `cocos-cli` [TN: đọc file]. Editor có chấp nhận đúng bản tối thiểu này không thì **chưa kiểm chứng** [SL].

`tsconfig.json` của project:
```jsonc
{
  "extends": "./temp/tsconfig.cocos.json",
  "compilerOptions": { "strict": false, "skipLibCheck": true }
}
```
- `skipLibCheck: true` là **bắt buộc** để type-check sạch: bản thân `cc.d.ts` 3.8.8 có lỗi nội bộ (GPU types, `____private`...) [TN: 60+ lỗi trong `cc.d.ts` khi tắt]. Project mẫu chính thức cũng bật `skipLibCheck` [TN].
- Trang docs ghi `./tmp/tsconfig.cocos.json`, nhưng project thật dùng `./temp/...` [TN: project mẫu; DOC ghi khác]. Dùng `temp`.

`temp/tsconfig.cocos.json` do editor sinh có: `target/module ES2015`, `strict: true`, `strictNullChecks: false`, `noImplicitAny: false`, `experimentalDecorators: true`, `isolatedModules: true`, `moduleResolution: node`, `types` trỏ tới `temp/declarations/{cc,jsb,cc.env,cc.custom-macro}`, `paths: {"db://assets/*": ...}` [TN: đọc mã nguồn cocos-cli `src/core/scripting/intelligence/index.ts`, vốn tách từ editor; với 3.8 là SL]. File `temp/declarations/cc.d.ts` của editor chỉ là `/// <reference>` tới `engine/bin/.declarations/cc.d.ts` [TN: cùng nguồn]. Đây chính là file ta build được từ source.

### 3.2 Thêm script, ảnh, JSON không cần `.meta`
- Được. Editor tạo `.meta` cho mọi file và thư mục trong `assets/` khi thiếu, lúc mở project hoặc khi file thay đổi [DOC: meta.html; https://docs.cocos.com/creator/3.8/manual/en/asset/asset-workflow.html].
- Nên đóng editor khi thêm/sửa file từ bên ngoài [DOC: asset-workflow].
- **Rủi ro uuid** [DOC: meta.html]:
  - Nếu một asset được tham chiếu bằng uuid (trong scene/prefab) mà `.meta` bị mất hoặc sinh lại, tham chiếu bị gãy ("resource loss").
  - Hai máy cùng sinh `.meta` cho một file chưa commit → hai uuid khác nhau → xung đột.
  - Copy file kèm `.meta` → trùng uuid.
- Code-first giảm gần hết rủi ro: code nạp asset theo **path**, không theo uuid. Chỉ còn `Main.scene` → `Bootstrap.ts` dùng uuid, và hai file đó có `.meta` cố định [TN].
- Quy tắc cho agent: **không bao giờ đổi tên/di chuyển `Bootstrap.ts` hoặc sửa uuid trong `.meta`**. Không copy `.meta`. Không xóa `.meta` đã commit. Thêm file mới thì không viết `.meta`; owner commit `.meta` sau lần mở editor kế tiếp.
- Khuyên: dùng LF cho mọi file, thêm `.gitattributes` (`* text=auto eol=lf`). Docs cảnh báo line ending khác nhau trong `.meta` gây lỗi đồng bộ [DOC: asset-workflow].

### 3.3 Định dạng `.meta` (để đọc hiểu, không cần viết)
- Script: `{"ver":"4.0.x","importer":"typescript","uuid":...,"userData":{...}}` [TN: project mẫu 3.8.8].
- Ảnh: `importer: "image"`, `userData.type` là `"texture"` (mặc định), `"sprite-frame"`, ...; với `sprite-frame` có sub-asset `@f9941` tên `spriteFrame` [TN: project mẫu]. Không nên tự viết meta ảnh [SL].

---

## 4. Code-first có khả thi không (câu hỏi 2)

**Có.** Bằng chứng [TN]: scene viết tay + `Bootstrap` tạo 120 sprite + Label từ code, nạp JSON và PNG, chạy trên engine 3.8.8 thật trong harness, 2 draw call (`$R/harness/skeleton.png`).

### 4.1 Scene tối thiểu
File `$R/skeleton/assets/scenes/Main.scene` (sinh bằng `$R/scripts/gen-scene.js`) gồm 14 object:
`cc.SceneAsset`, `cc.Scene` (`_id` = uuid của scene), node `Canvas` (layer `UI_2D` = 33554432) với `cc.UITransform`, `cc.Canvas`, `cc.Widget` (align 4 cạnh), component Bootstrap, node con `Camera` với `cc.Camera` (ORTHO, `_visibility` 41943040, clearFlags 7), `cc.SceneGlobals` + `AmbientInfo`/`ShadowsInfo`/`SkyboxInfo`, `cc.PrefabInfo`.

- Component script trong scene được tham chiếu bằng **uuid nén** của file `.ts.meta`, không bằng tên class [TN: scene mẫu chính thức có `"__type__": "2c510NsGGFIbpHzebAjhUU0"` ứng với uuid `2c51036c-1861-486e-91f3-79b023854534`]. Thuật toán nén: giữ 5 ký tự hex đầu, 27 ký tự hex còn lại cứ 3 ký tự → 2 ký tự base64 [TN: tái tạo đúng chuỗi trên]. Code ở `$R/scripts/gen-scene.js`.
- Viết tay có an toàn không? Engine runtime đọc được [TN]. Editor có mở mà không sửa gì không: **chưa kiểm chứng** [SL]. Editor có thể bổ sung trường mặc định khi lưu lại; như vậy là bình thường. Quy tắc: agent **không sửa scene sau lần đầu**; mọi thứ mới đi vào code.

### 4.2 Nạp động (dynamic loading)
- Chỉ nạp theo path được asset trong thư mục `assets/resources` [DOC: dynamic-load-resources].
- Path tương đối với `resources`, **không có đuôi file** [DOC].
- SpriteFrame/Texture2D là sub-asset: `'textures/hero/spriteFrame'`, `'textures/hero/texture'` [DOC]. Chỉ tồn tại nếu kiểu import khớp (sprite-frame/texture) [DOC: image.html]. **Quy tắc dự án: nạp `ImageAsset` (path gốc, kiểu `ImageAsset`) rồi tạo SpriteFrame bằng code** [TN trong harness với `createWithImage`; với `resources.load(..., ImageAsset)` trong editor là SL].
- SpriteAtlas (`.plist` TexturePacker): nạp `SpriteAtlas` rồi `getSpriteFrame(name)` [DOC]. Cần editor import `.plist`. Thay thế code-first: một PNG atlas + JSON rect tự định nghĩa (ví dụ spritesheet XML/JSON của Kenney chuyển sang JSON), tạo `SpriteFrame` với `texture` chung và `rect` riêng [TN: 400 sprite, 4 frame cùng texture → 1 draw call, `$R/harness/atlas-test.png`].
- `resources.loadDir`, `preload`, `preloadDir` có sẵn [DOC].
- `assetManager.loadRemote` không hỗ trợ SpriteFrame/SpriteAtlas/TiledMap; dùng cho ảnh rời [DOC].
- Cảnh báo: mọi thứ trong `resources` đều vào bản build và làm to `config.json` [DOC]. Chỉ để ở đó cái thật sự nạp động.

### 4.3 Chi phí của code-first
- Không chỉnh trực quan trong editor. UI layout phải viết bằng code (Widget/Layout từ code) [SL].
- Batching phụ thuộc thứ tự node và texture. Phải chủ động dùng atlas [DOC: ui-batch].
- Dynamic atlas (tự gộp texture < 512 px lúc chạy) **bật mặc định trên web, tắt trên native và mini game** [DOC: https://docs.cocos.com/creator/3.8/manual/en/advanced-topics/dynamic-atlas.html]. Trên Android không được trông vào nó; phải dùng atlas thật.
- Asset chỉ nạp bằng code không được editor "nhìn thấy" như phụ thuộc của scene; vì vậy phải nằm trong `resources` hoặc bundle [DOC: dynamic-load-resources].

---

## 5. Quy tắc engine cho lập trình viên (câu hỏi 5)

### 5.1 Script, decorator, lifecycle
- Import mọi API từ `'cc'`. Biến toàn cục `cc` không còn từ 3.0 [TN: `cc.log` báo lỗi type `never` khi type-check]. Ví dụ đúng: `import { _decorator, Component, Node } from 'cc'; const { ccclass, property } = _decorator;`.
- `@ccclass('TênDuyNhất')`: tên phải duy nhất toàn project, kể cả ở thư mục khác [DOC: https://docs.cocos.com/creator/3.8/manual/en/scripting/decorator.html].
- `@property` với kiểu class phải khai báo `type` rõ (`@property(Node)`, `@property({ type: [Node] })`) [DOC: decorator]. Code-first ít cần `@property`.
- Thứ tự: `onLoad` → `onEnable` → `start` → `update` → `lateUpdate`; `onDisable`, `onDestroy` [DOC: https://docs.cocos.com/creator/3.8/manual/en/scripting/life-cycle-callbacks.html]. Hủy là hoãn đến cuối frame [DOC].
- `executionOrder` chỉ áp dụng cho onLoad/onEnable/start/update/lateUpdate [DOC: decorator].
- Gỡ listener trong `onDestroy` (`input.off`, `node.off`) [DOC: event-input].
- `getComponent` nhận class hoặc tên ccclass, không nhận tên file [DOC: https://docs.cocos.com/creator/3.8/manual/en/release-notes/upgrade-guide-v3.0.html].
- Trình compile của Cocos dùng TS ~4.1, `isolatedModules`, bỏ qua lỗi type, **không đọc `tsconfig.json`** [DOC: language-support]. Vì vậy agent phải tự chạy `tsc` (mục 6).

### 5.2 Node, UITransform, Sprite trong 2D
- Mọi node UI/2D phải có `UITransform` và `layer = Layers.Enum.UI_2D` [TN: mọi node trong harness đặt như vậy và hiện đúng]. Node mới tạo bằng `new Node()` không tự lấy layer của cha; camera Canvas chỉ vẽ layer có trong `visibility` [SL: chưa thử trường hợp thiếu layer].
- Kích thước/anchor nằm ở `UITransform` (`setContentSize`, `anchorPoint`), không phải `node.width` [DOC: upgrade-guide].
- Vị trí: `node.setPosition(x, y, 0)`; không có `node.x` [DOC: upgrade-guide]. Đọc `node.position` trả về `Readonly<Vec3>`; không sửa trực tiếp [SL].
- Màu ở component render (`sprite.color`); độ trong suốt dùng màu hoặc `UIOpacity` [DOC: upgrade-guide].
- `zIndex` đã bỏ; dùng `setSiblingIndex` hoặc Sorting2D [DOC: upgrade-guide; sorting-2d].
- `Sprite.sizeMode`: `RAW`/`TRIMMED` lấy theo frame; `CUSTOM` để tự đặt kích thước [TN].

### 5.3 Tọa độ, Canvas, Camera, độ phân giải
- Canvas node đặt ở tâm vùng thiết kế; con của Canvas có gốc (0,0) ở giữa màn hình [TN: scene skeleton].
- `EventTouch.getUILocation()` trả tọa độ thiết kế, gốc **góc dưới-trái** [DOC: https://docs.cocos.com/creator/3.8/manual/en/engine/event/event-input.html; TN: chạm tại CSS (100,800) trên khung 540×960, thiết kế 720×1280 FIXED_WIDTH → UI (133,213)]. Đổi sang tọa độ node bằng `uiTransform.convertToNodeSpaceAR(v3)` [SL].
- Design resolution đặt ở Project Settings → General; mọi Canvas dùng chung [DOC: https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/engine/multi-resolution.html]. Runtime có `view.setDesignResolutionSize(w, h, ResolutionPolicy.X)` [TN: hoạt động trong harness].
- **Đề xuất: portrait 720×1280, Fit Width bật, Fit Height tắt** (tương đương `FIXED_WIDTH`) [SL]. Lý do: chơi một tay, điện thoại dài hơn 16:9 sẽ thấy thêm chiều cao thay vì viền đen. UI bám mép bằng `Widget` [DOC: https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/widget.html].
- Owner phải đặt đúng cùng giá trị trong Project Settings, và Orientation = Portrait trong Build panel [DOC: https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-web.html].
- Trang HTML phải có `<meta name="viewport" content="width=device-width,...">` như template web-mobile chính thức; thiếu nó thì trên mobile khung bị tính 980px và tọa độ touch sai [TN].
- Widget: ALWAYS căn mỗi frame; muốn đổi vị trí lúc chạy thì dùng ONCE và sửa `top/bottom/...` [DOC: widget].

### 5.4 Input và joystick ảo
- Dùng `input.on(Input.EventType.TOUCH_START | TOUCH_MOVE | TOUCH_END | TOUCH_CANCEL, cb, this)`. `systemEvent` đã deprecated từ 3.4 [DOC: event-input].
- Multi-touch hoạt động: ngón 1 giữ joystick, ngón 2 bấm skill, mỗi ngón có `getID()` riêng [TN].
- Joystick: lưu ID ngón đầu tiên chạm nửa dưới-trái; tính vector = (vị trí hiện tại − vị trí bắt đầu), kẹp độ dài; gửi hướng chuẩn hóa vào lõi. Nút skill dùng node event `Node.EventType.TOUCH_START` trên node nút [SL].
- Luôn xử lý `TOUCH_CANCEL` giống `TOUCH_END` [SL].

### 5.5 100+ sprite chuyển động
- Một texture/atlas cho tất cả quái, cùng material mặc định → batch thành ít draw call [DOC: ui-batch; TN: 400 sprite 1 draw call].
- Sprite và Label xen kẽ làm vỡ batch; Mask/Graphics không batch [DOC: ui-batch]. Đặt Label (thanh máu, số damage) vào một layer node riêng sau đám quái, hoặc dùng BMFont/CHAR cache [DOC: ui-batch; label].
- Không cấp phát mỗi frame: không `new Vec3` trong `update`; dùng `setPosition(x, y, z)` bằng số; dùng lại mảng; không closure mới mỗi frame [SL, thực hành chuẩn].
- Pool: `NodePool.put()` gọi `removeFromParent()` và `unuse()`; `get()` gọi `reuse()` [TN: đọc `extensions/ccpool/node-pool.ts` 3.8.8]. Có báo cáo reuse/unuse không chạy như mong đợi ở 3.8.2 [CĐ: https://forum.cocos.org/t/topic/157654]. **Khuyên tự viết pool đơn giản**: giữ node trong cây, ẩn bằng `active = false` hoặc chuyển ra ngoài màn hình, quản lý bằng mảng free-list [SL].
- Không dùng physics engine cho đám đông; va chạm làm trong lõi (mục 2.1) [SL].
- Sort chiều sâu bằng Sorting2D (`sortingOrder`) thay vì đổi sibling index liên tục [TN chức năng; hiệu năng là SL].
- Đo bằng `director.root.device.numDrawCalls` trong harness [TN]. FPS trong harness (SwiftShader) không phản ánh điện thoại.

### 5.6 Animation sprite sheet
- Đơn giản nhất cho đám đông: một manager đổi `sprite.spriteFrame` theo thời gian, frame lấy từ cùng atlas [SL]. Không tạo `Animation` component cho mỗi quái.
- Có `AnimationClip.createWithSpriteFrames(spriteFrames, sample)` [TN: có trong `cc.d.ts` 3.8.8]. Có báo cáo clip tạo động không phát lần sau ở 3.8.3 [CĐ: https://forum.cocos.org/t/topic/160886]. Dùng cho hero (ít) nếu cần; kiểm tra kỹ.
- Tween: dùng `tween(node).to(...).start()`; Action API của 2.x đã bỏ [DOC: upgrade-guide].

### 5.7 UI, Label, font
- Label `cacheMode`: NONE (mặc định), BITMAP (vào dynamic atlas, cho text ít đổi), CHAR (bảng 1024×1024 dùng chung, tốt cho số damage; không hỗ trợ SHRINK, bold/italic) [DOC: https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/label.html].
- Font hệ thống hoạt động không cần asset [TN: Label render trong harness]. Font TTF/BMFont cần asset do editor import [SL].
- Layout, ScrollView dùng được từ code; chưa kiểm chứng trong harness [SL].

### 5.8 Audio
- `AudioSource.playOneShot(clip, volume)` cho hiệu ứng ngắn (không dừng được); `play()` cho nhạc nền [DOC: https://docs.cocos.com/creator/3.8/manual/en/audio-system/audiosource.html].
- Trên web phải có thao tác người dùng (chạm đầu tiên) trước khi phát [DOC: audiosource].
- `audioEngine` của 2.x đã bỏ [DOC: upgrade-guide].

### 5.9 Scene và lưu dữ liệu
- Code-first: một scene. Nếu thêm scene: `director.loadScene('Name')`, `preloadScene`; node bền qua scene bằng `director.addPersistRootNode` (phải là root node) [DOC: https://docs.cocos.com/creator/3.8/manual/en/scripting/scene-managing.html]. Scene phải được chọn trong Build panel [SL].
- Lưu: `sys.localStorage.setItem(key, JSON.stringify(obj))`; web dùng Web Storage, native dùng sqlite [DOC: https://docs.cocos.com/creator/3.8/manual/en/advanced-topics/data-storage.html]. Lõi định nghĩa định dạng save có `version`; view chỉ đọc/ghi chuỗi [SL].

### 5.10 TypeScript và module
- `.ts` là ESM. Specifier tương đối tới `.ts` **không ghi đuôi**; tới `.js`/`.mjs` **phải ghi đuôi** [DOC: modules/spec].
- Gói npm: hỗ trợ theo thuật toán Node, conditional exports `import`/`default` (không `require`/`node`), không hỗ trợ trường `browser`, **không có module built-in của Node** (`fs`...) [DOC: modules/spec]. Quy tắc dự án: **không thêm gói npm vào game** nếu chưa được duyệt.
- Không đổi `target`, `module` trong tsconfig [DOC: tsconfig].
- Class fields: project 3.8 mẫu bật `useDefineForClassFields: true` trong `settings/v2/packages/project.json` [TN: đọc file]. `@property` với giá trị khởi tạo chạy đúng với cả hai chế độ trong harness [TN].
- Biến môi trường build: `import { DEBUG, HTML5, NATIVE } from 'cc/env'` (thay `CC_DEBUG` cũ) [DOC: upgrade-guide; TN: `cc.env.d.ts` sinh được].

### 5.11 Build target
- web-mobile: chọn Orientation, có vConsole, polyfill; thư mục build theo tên task [DOC: publish-web].
- Android: Android Studio 2022.2.1/2022.3.1, JDK 17, NDK r21–r23, API 26/28; cấu hình đường dẫn ở Preferences → Program Manager [DOC: https://docs.cocos.com/creator/3.8/manual/en/editor/publish/setup-native-development.html]. Làm sau, không phải bây giờ.
- Build bằng dòng lệnh (trên máy owner): `CocosCreator --project <path> --build "platform=web-mobile;debug=true"` hoặc `configPath=<json export từ Build panel>`. Mã thoát 36 = thành công, 32 = tham số sai, 34 = lỗi khác [DOC: https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-in-command-line.html]. Lỗi treo khi build dòng lệnh ở 3.8.2 đã sửa ở 3.8.3 [CĐ: https://github.com/cocos/cocos-engine/issues/16892].

### 5.12 Bẫy từ tutorial cũ (2.x, 3.0–3.6)

| Sai (cũ) | Đúng (3.8) | Nguồn |
|---|---|---|
| `cc.Class({...})`, biến toàn cục `cc` | `@ccclass` + `import from 'cc'` | DOC upgrade-guide, TN |
| `node.x`, `node.width`, `node.opacity`, `node.color` | `setPosition`, `UITransform`, `UIOpacity`, `sprite.color` | DOC upgrade-guide |
| `node.zIndex` | `setSiblingIndex`, Sorting2D | DOC upgrade-guide, sorting-2d |
| `cc.loader.loadRes` | `resources.load`, `assetManager` | DOC dynamic-load |
| `resources.load('img', SpriteFrame)` | `'img/spriteFrame'` (và ảnh phải là kiểu sprite-frame) hoặc nạp ImageAsset | DOC dynamic-load, image |
| `systemEvent.on(...)` | `input.on(...)` | DOC event-input |
| `cc.audioEngine` | `AudioSource` | DOC upgrade-guide |
| `cc.moveTo`/Action | `tween` | DOC upgrade-guide |
| `camera.backgroundColor`, `cullingMask` | `clearColor`, `visibility` | DOC upgrade-guide |
| `CC_DEBUG` | `DEBUG` từ `cc/env` | DOC upgrade-guide |
| `UITransform.priority` | Đã deprecated từ 3.1 | DOC upgrade-guide |
| `const enum` | `enum` thường | DOC language-support |

`cc.d.ts` 3.8.8 có 683 chỗ `@deprecated` [TN: đếm]. Khuyên bật luật ESLint `@typescript-eslint/no-deprecated` trong `tools/` [SL].

### 5.13 Quy ước đặt tên
- File component: PascalCase trùng tên class (`Bootstrap.ts` → `@ccclass('Bootstrap')`) [SL].
- Tên ccclass có tiền tố dự án nếu dễ trùng, ví dụ `'RH_Bootstrap'`... **Không đổi tên ccclass của Bootstrap** vì scene không phụ thuộc tên nhưng phụ thuộc uuid; tên vẫn phải duy nhất [DOC: decorator].
- Asset trong `resources`: chữ thường, gạch ngang, không dấu cách (path dùng trong code) [SL].

---

## 6. Agent kiểm chứng gì trên Linux, bằng cách nào

### 6.1 Sinh khai báo `cc` (không cần editor)
Lệnh đã chạy [TN]:
```bash
git clone --depth 1 --branch v3.8.8 https://github.com/cocos/cocos-engine.git
cd cocos-engine
npm install --ignore-scripts --no-audit --no-fund        # 13 s, 1523 gói
# Bundler khai báo cần các file .d.ts emscripten trong native/external:
git clone --depth 1 --branch v3.8.8-2 --filter=blob:none --sparse \
  https://github.com/cocos/cocos-engine-external.git native/external
(cd native/external && git sparse-checkout set emscripten)   # 23 MB
npm run build:debug-infos
npm run build:declaration    # ~21 s -> bin/.declarations/cc.d.ts (3.3 MB, 75 874 dòng)
```
- Không có `native/external` thì lỗi `Input file .../native/external/emscripten/external-wasm.d.ts ... not found` [TN].
- Sau đó: `node $R/scripts/gen-declarations.js <engine> <project>` sinh `temp/declarations/{cc,cc.env,jsb,cc.custom-macro}.d.ts` và `temp/tsconfig.cocos.json` giống editor [TN].
- Type-check: `tsc -p game/tsconfig.json --noEmit` → sạch với skeleton; bắt được lỗi API sai (`spriteFrameX`) và `cc.log` [TN].
- Toàn bộ quy trình gói trong `$R/scripts/setup-engine.sh`.

### 6.2 Unit test lõi
- `npx vitest run` hoặc `npx tsx --test` trong `tools/` [TN]. Vitest cần `server.fs.allow: ['..']` nếu test import file ngoài thư mục gốc vitest [TN].
- Kiểm tra cấm import: `grep -rn "from 'cc'" game/assets/scripts/core` phải rỗng [SL, nên đặt thành test].

### 6.3 Harness trình duyệt với engine thật
Thành phần (tất cả trong `$R`):
- `scripts/build-engine-web.js`: gọi `buildEngine` của `@cocos/ccbuild` (chính công cụ engine dùng), ra `out-engine-esm/cc.js` (1 file ESM ~3.7 MB, ~35 s). Features: `base, gfx-webgl, gfx-webgl2, 2d, ui, graphics, mask, rich-text, animation, tween, audio, tiled-map, intersection-2d, profiler, particle-2d, legacy-pipeline, sorting-2d`. **Phải đặt `targets: 'chrome 100'`**; mặc định Babel hạ cấp vòng lặp sinh code lỗi `ReferenceError: _i is not defined` trong `insertBuiltinBindings` [TN].
- Builtin effect: editor đưa effect/material builtin qua bundle `internal`. Harness thay bằng: biên dịch `.effect` của engine 3.8.8 bằng `shdc-lib.js` (trình biên dịch shader JS, MIT, lấy từ repo chính thức `cocos/cocos-cli` commit `387dc4f`) chạy ngay trong Chromium cạnh `cc.js` (vì nó cần `offline-mappings` từ engine). Ra `harness/www/builtin-2d-effects.json` (`builtin-sprite`, `builtin-graphics`, `builtin-clear-stencil`, `builtin-unlit`, có glsl1/glsl3/glsl4) [TN]. Script: `effect-tool/build-browser.mjs`, `harness/compile-effects.mjs`.
- `harness/src/harness-boot.ts`: đăng ký effect, tạo các material builtin (`ui-sprite-material`, `ui-graphics-material`...) giống fixture test của engine, rồi `game.init` + `game.run` [TN].
- `harness/run.mjs`: server tĩnh + Playwright Chromium (`/opt/pw-browsers`), cờ `--use-angle=swiftshader`, chờ `window.__done`, in log, chụp screenshot [TN].
- `harness/touch-run.mjs`: gửi multi-touch qua CDP `Input.dispatchTouchEvent` [TN].

Kết quả [TN]:
| Test | Kết quả |
|---|---|
| `smoke.html?rm=2` (150 component, update) | chạy, ~59 fps SwiftShader |
| `smoke.html?rm=3` (headless renderMode) | lỗi: cần thêm feature `gfx-empty` khi build |
| `render-demo.html` (150 sprite + Graphics + Label) | render đúng, 3 draw call (`render-demo.png`) |
| `atlas-test.html` (400 sprite, 4 sub-rect cùng texture) | 1 draw call (`atlas-test.png`) |
| `sorting-test.html?sort=0/1` | điểm chồng: xanh (thứ tự cây) / đỏ (Sorting2D order 10) |
| `touch-test.html` + `touch-run.mjs` | START/MOVE/END đúng, 2 ngón id 0 và 1 |
| `skeleton.html` (scene + script của skeleton) | `deserialized: SceneAsset scene=Main`, 122 node con, 2 draw call (`skeleton.png`) |

Giới hạn của harness (phải nói rõ với mọi người) [SL trừ khi ghi khác]:
- Không có `settings.json`, bundle `internal`, bundle `resources`. `resources.load` **không chạy** trong harness → bắt buộc lớp `AssetLoader` [TN: thiết kế đã dùng].
- Script trong editor được Babel của Cocos biên dịch và class được đăng ký theo uuid (`_RF.push`). Harness dùng esbuild và `js.setClassAlias(Bootstrap, uuidNén)` để mô phỏng [TN chạy; tương đương là SL].
- Shader biên dịch bằng `shdc-lib` của cocos-cli (Cocos 4) có thể khác chi tiết với editor 3.8.8; 4 effect trên render đúng [TN].
- FPS trong SwiftShader vô nghĩa cho điện thoại. Chỉ tin số draw call và tính đúng.
- Effect khác (profiler/showFPS, particle, spine...) chưa biên dịch → bật `showFPS` gây lỗi `getBinding` [TN]. Thêm effect vào lệnh `compile-effects.mjs` nếu cần.

### 6.4 Chạy bản build do owner gửi về
Bản web-mobile là HTML + JS tĩnh. Agent serve bằng server tĩnh và mở bằng Playwright để chụp màn hình/chạy kịch bản [SL; chưa có bản build để thử].

---

## 7. Thí nghiệm khả thi (câu hỏi 3)

| # | Hướng | Kết quả | Thời gian |
|---|---|---|---|
| A | Build engine 3.8.8 từ source trên Linux | **Được**. Khai báo `cc.d.ts` và `cc.js` ESM. Lệnh ở 6.1, 6.3 [TN] | ~1 giờ kể cả gỡ lỗi |
| B | Chạy engine trong trang web với script bundle bằng esbuild | **Được**, cần tự cung cấp effect + material builtin [TN] | ~1 giờ |
| C | Chạy scene/script của project viết tay trên engine thật | **Được** [TN] | 20 phút |
| D | `cocos/cocos-cli` (0.2.0-beta.2) | **Không phù hợp**. `repo.json` ghim engine `cocos/cocos4` tag `4.0.0-beta.2`; mọi tag cũ cũng ghim Cocos 4. README chỉ nêu Windows/macOS, cần Electron 42 + native build. Không phải công cụ build cho 3.8 [TN: đọc source]. Không build thử | 15 phút |
| E | Cocos 4 headless | Cocos 4 đang beta (`4.0.0-beta.2`) [TN]; headless "đang chuyển dần sang CLI" [DOC/báo chí: https://technode.global/prnasia/cocos-4-is-here-fully-open-source/]. Không dùng cho 3.8 | 10 phút |
| F | Wine chạy editor Windows | **Không khả thi ở đây**: `apt-get install wine64` → `Unable to locate package`; `https://download.cocos.com/` → `Connection reset by peer` [TN]. Không có báo cáo cộng đồng về Wine với 3.8 [CĐ: không tìm thấy] | 5 phút |
| G | Docker/CI cộng đồng | Chỉ có image không chính thức (`jnqa/cocos-creator-builder`), không xác minh được, và quy tắc nhóm cấm chạy binary không chính thức. CI chính thức là chạy editor trên Windows/macOS bằng dòng lệnh [CĐ: https://github.com/cocos/cocos-engine/issues/16892] | 5 phút |

Ghi chú lệnh then chốt và đầu ra:
```text
$ git ls-remote --tags https://github.com/cocos/cocos-engine.git | grep 3.8
... 3.8.7  3.8.8  v3.8.8  v3.8.8+patch.1   (nhánh v3.8.9 có, tag chưa có)

$ node scripts/build-engine-web.js dl-engine/cocos-engine out-engine-esm
done in 33.9 s   {"exports":{"cc":"cc.js"},"hasCriticalWarns":false}

$ node harness/run.mjs skeleton.html
deserialized: SceneAsset scene=Main
bootstrapReady=true canvasChildren=122 hasBootstrap=true
drawCalls=2
[log] Cocos Creator v3.8.8
[log] Using legacy pipeline
```

---

## 8. Sản phẩm để lại trong thư mục thí nghiệm

Đường dẫn tuyệt đối:
- `/tmp/claude-0/-home-user-slop/58b8dc59-e543-58a3-b5a2-f1ae221258e1/scratchpad/cocos-research/skeleton/` — project skeleton 3.8.8 (package.json, tsconfig.json, .gitignore, `Main.scene` + meta, `Bootstrap.ts` + meta, `AssetLoader.ts`, `core/sim.ts`, `resources/data/units.json`, `resources/textures/ball.png`). Có `temp/` do script sinh (để type-check; editor sẽ ghi đè). Uuid: scene `4a24a7dd-af17-483e-8cfa-f17abbcc6392`, Bootstrap `60aebf07-3501-4242-86eb-eae8e528621d` (nén: `60aeb8HNQFCQobr6ujlKGId`).
- `.../cocos-research/scripts/` — `setup-engine.sh`, `build-engine-web.js`, `gen-declarations.js`, `gen-scene.js`.
- `.../cocos-research/harness/` — harness: `src/*.ts`, `www/*.html`, `run.mjs`, `touch-run.mjs`, `compile-effects.mjs`, ảnh `*.png`.
- `.../cocos-research/effect-tool/` — bundle trình biên dịch effect cho trình duyệt.
- `.../cocos-research/out-engine-esm/cc.js` — engine 3.8.8 dạng ESM.
- `.../cocos-research/skeleton-tests/` — ví dụ test tsx và vitest cho lõi.
- `.../cocos-research/dl-engine/cocos-engine/` — source engine 3.8.8 đã cài (cần cho build lại; có thể xóa `node_modules`, cài lại mất 13 s).

Đề xuất bước tiếp: một agent chuyển `scripts/` + `harness/` + `effect-tool/` vào `tools/` của repo, output (`cc.js`, `cc.d.ts`, effect JSON) để gitignore và sinh bằng một lệnh `npm run setup`.

---

## 9. Checklist cho product owner (lần mở đầu tiên)

Cài đặt:
1. Cài **Cocos Dashboard** từ https://www.cocos.com/en/creator-download, rồi cài **Cocos Creator 3.8.8** (đúng số này, không 3.8.9, không 4.x).

Mở project:
2. Dashboard → Projects → **Add/Import** → chọn thư mục `game/` (hoặc thư mục skeleton). Nếu hỏi phiên bản, chọn 3.8.8.
3. Chờ import xong. Mở panel **Console**. Chụp màn hình mọi dòng vàng/đỏ.
4. Assets panel → mở `assets/scenes/Main.scene`. Chọn node **Canvas**. Inspector phải có component **Bootstrap** (không phải "Missing Script"). Chụp màn hình Inspector.

Cài đặt project:
5. Project → Project Settings → **Project Data / General**: Design Resolution **720 × 1280**, **Fit Width = bật**, **Fit Height = tắt**.
6. Project Settings → **Feature Cropping**: bật **2D Rendering Sorting** (Sorting2D). Có thể tắt module 3D, physics 3D, physics 2D, spine, dragonbones, terrain, xr nếu không cần (không bắt buộc ở bước này).

Chạy thử:
7. Bấm **Preview** (trình duyệt). Kỳ vọng: nền xanh tối, ~120 chấm tròn cam chạy, chữ vàng "Bootstrap OK". Chụp màn hình và copy log console trình duyệt.

Build:
8. Project → **Build** → Platform **Web Mobile**, Start Scene = `Main`, Orientation = **Portrait**, Debug = bật. Build. Nén thư mục `build/web-mobile` gửi lại.
9. Trong Build panel, **export** cấu hình build thành JSON (để sau này build bằng dòng lệnh) và gửi lại.

Gửi về / commit:
10. Commit (hoặc gửi zip) **toàn bộ file `.meta` mới**, thư mục **`settings/`**, `package.json` và `Main.scene` nếu editor đã sửa. **Không** gửi `library/`, `temp/`, `local/`.
11. Ghi lại: phiên bản trong Help → About, hệ điều hành, và mọi cảnh báo khi mở.

---

## 10. Những điều chưa xác nhận được

1. Editor 3.8.8 mở skeleton viết tay mà không lỗi (package.json tối thiểu, scene viết tay, meta viết tay với `ver` tự đặt). Chỉ runtime đã kiểm chứng.
2. Dashboard có bắt buộc trường nào khác trong `package.json` không; trường `"type": "2d"` có hợp lệ không.
3. Editor có tự sửa/ghi lại `Main.scene` khi mở, và có giữ nguyên uuid trong `.meta` viết tay không (docs nói uuid lấy từ `.meta`, nên kỳ vọng là giữ).
4. `temp/tsconfig.cocos.json` của editor 3.8.8 giống hệt bản sinh từ code cocos-cli (Cocos 4); tôi đối chiếu bằng nguồn cocos-cli, không bằng editor 3.8.8.
5. Shader do `shdc-lib` (cocos-cli) sinh có giống editor 3.8.8 không, ngoài 4 effect đã render đúng.
6. Khác biệt hành vi giữa harness (esbuild, không settings, không bundle) và runtime thật của bản build; đặc biệt là `resources.load(path, ImageAsset)` + `SpriteFrame.createWithImage` trong bản build thật.
7. Hiệu năng trên điện thoại thật với 100+ quái; số FPS trong harness không có giá trị.
8. Hành vi trên Android: dynamic atlas tắt (theo docs), `sys.localStorage` dùng sqlite; chưa build thử.
9. TiledMap tạo từ code; Layout/ScrollView/RichText trong harness; font TTF/BMFont.
10. `NodePool` reuse/unuse và `AnimationClip.createWithSpriteFrames` ở 3.8.8 (có báo cáo lỗi ở 3.8.2/3.8.3, chưa thử lại).
11. Sorting2D có làm giảm batch khi kết hợp nhiều texture không; chỉ kiểm chứng thứ tự vẽ.
12. Import JSON như ES module trong script Cocos; tài liệu tôi đọc không nói, nên dự án dùng `JsonAsset`.
13. Bản 3.8.8 có bản vá `v3.8.8+patch.1` (tag GitHub); Dashboard có cung cấp bản vá này không thì chưa rõ. Owner ghi lại số phiên bản chính xác ở bước 11.
14. `cocos-cli` có build được project 3.8 không: không thử build, chỉ đọc source (ghim engine Cocos 4).
