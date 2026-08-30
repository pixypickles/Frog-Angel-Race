# 天使カエル・レース Prototype v0.5

1対1の高速レース操作を確認するためのブラウザ試作です。

## 起動
`index.html` をブラウザで開いてください。PC / タッチ操作の両方を想定しています。

## 操作
- 左スティック / 矢印・WASD: 旋回
- ジャンプ / Space: 1回=ジャンプ、2回=羽ばたき加速、3回=滑空して最高速へ
- 滑空中: 約5秒ごとの羽ばたきタイミングで再度ジャンプすると滑空延長
- 舌 / E: コーナー内側の木を最優先して掴む。長押しで旋回し、離して解除
- A / J: ミカエル=パンチ、ガブリエル=水弾（小反動）
- B / K: ミカエル=泡弾、ガブリエル=水レーザー（大反動）
- 操作交代 / C: ミカエルとガブリエルを切り替えて挙動確認

## 今回の仕様
- 高速ほど通常旋回が弱くなり、最高速では大きなカーブをライン取りで攻略する必要があります。
- コース外のガード草へぶつかると速度低下します。
- 舌アンカー旋回は保持時間が短すぎると曲がり不足、長すぎると引っ張られて減速します。
- コーナリング用アンカー舌はライバルとの接触・重なりの影響を受けません。
- アンカーが近くにない場合のみ、舌はライバルを狙い、相手を少し減速・自分を一瞬加速させます。
- ミカエルのパンチ／泡弾は相手を弾きます。直接減速ではなく、壁へ押し込む用途です。
- ガブリエルの水技は横方向へ放水し、その反対方向への反動で機体を動かします。
- ガブリエルBの水レーザーは壁まで届く長い描画＋大反動で、舌なしの急旋回にも使えます。
- CPUガブリエルもカーブで水反動を使います。

## 調整候補
最高速、通常旋回限界、滑空維持受付（現状およそ3.8〜5.9秒）、舌の最適解除時間、水レーザー反動量は次版でプレイ感を見ながら詰める前提です。

## v0.6 changes
- Action buttons are now a fixed 2x2 block: Jump / Tongue on the top row, Skill A / Skill B on the bottom row, kept inside the safe screen area.
- World expanded to 6000 x 4400.
- Replaced the simple oval circuit with a long pond course containing multiple hairpins and S-bends.
- The course is now an airborne corridor over water. The visible boundaries are tall guard-grass walls; below are pond water, puddle-like highlights, and lily pads.
- Inner corner posts/trees remain tongue anchors and are placed around the major turns and hairpins.
- Grass-wall collisions still reduce speed and reflect the racer back toward the course.


## v0.8
- 左スティックと右側4ボタンを全体的に上へ移動。
- 低い画面でも下端から余白を確保。
- ガード草を滑らかな帯ではなく、三角形の草葉が連なるギザギザ表現へ変更。
