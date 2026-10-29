# TB-022 editable source and evidence

This directory preserves the original plate44 plan/elevation and plate43 photograph, quantitative calibration, source/rights records and repeatable actual-model export recipes. It is outside the public runtime package. Runtime factory/forms live in [assets](../../../assets/art/exposition-new-york/manifest.json); delivery and JPGs live in [docs](../../../docs/art/exposition-new-york/README.md).

[sources.json](sources.json) identifies McKim, Mead & White / Getty / Internet Archive item `gri_33125006526145`, source PDF/ZIP/page SHA-256 values, JP2 member names, source URLs and the catalogued public-domain evidence. `raw/plate-44.jp2` is the exact original scan99 page (0098 member); `raw/plate-43.jp2` is scan97 (0096). The PDF's small JBIG2 glyphs were less legible; original JP2 pages support the recorded77 ft chain and ruler readings. The full PDF/ZIP are ignored research caches, reused rather than committed.

[The porch detail](porch-column-source.jpg) shows the paired outer columns and clear side-stair axis; the measurement record preserves all 22 centroids per porch and the separate connector/curve profile.

[measurements.json](measurements.json) separates printed facts, ruler-derived dimensions, the uncompressed source outline, authored dimensions and uncertainty/inference. Crop coordinates refer to the2010 ×3000 original page. JPEG evidence is compressed only for review, not used as runtime art. Plate43 is rotated270 degrees to upright; the source remains unretouched.

Run from the project root, using Node 22+ (24.15.0 checked) and Python 3.12 with Pillow 12.3.0. Offline renders additionally require Mitsuba 3.9.1 and NumPy 2.3.5. The existing local installation is `artifacts/render-deps`; dependencies are not vendored or installed by these recipes.

```powershell
python -X utf8 art/source/exposition-new-york/prepare-evidence.py
node art/source/exposition-new-york/build-manifest.mjs
node workbenches/art/check-exposition-new-york.mjs
node art/source/exposition-new-york/export-review.mjs
python -X utf8 art/source/exposition-new-york/render-review.py
python -X utf8 art/source/exposition-new-york/compare-source.py
node tools/check.mjs
node tools/build.mjs
node workbenches/art/check-exposition-new-york.mjs --package
```

`prepare-evidence.py` uses the two committed JP2 files, checks their source hashes, creates source-only JPGs/annotation and refreshes derivative hashes. `build-manifest.mjs` creates deterministic runtime metadata/hashes. `export-review.mjs` writes actual instanced/skinned mesh triangles into per-material PLYs and records camera/reference data under ignored `artifacts/exposition-new-york/renders`. It borrows the existing plaster/concrete and slate maps and the already approved native bear pin `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`; it imports no new donor revision. The native multi-view bear paint shader is omitted and captioned.

`render-review.py` is finite, with a real 120-second same-process deadline and PID/creation-FILETIME ownership record. Use `--view front-isometric` to render a single view or `--spp 24` to set samples. It exits after writing its JPGs. Each record includes executable, task, start, expiry, stop method, completion and port=null. No interactive tester or retained server is required. The optional package check creates a short-lived private HTTP listener with a real 30-second deadline, closes it in`finally` and checks that the port was released. Outputs and restart sources remain durable here; no disposable helper is retained.

Model JPGs are actual-mesh CPU appearance evidence; WebGL shader/performance acceptance remains the architect's gate. See [offline review](../../../docs/art/exposition-new-york/offline-review.json) for the final inspected image hashes and limitations.
