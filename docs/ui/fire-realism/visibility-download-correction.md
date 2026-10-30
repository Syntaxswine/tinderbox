# Focused native-review correction

The architect's actual native Chrome review of combined `4e5b926bc4f5eb55fd829d8d174b3d1eee01c578` found two concrete UI defects. A ready WebGL scene with the native bear and HUD retained the unavailable overlay. Actual ten-second reference video encoding succeeded, but the automatic second metadata download caused Chrome's multiple-download permission prompt. This correction is UI-only, developed from `b08f6a6`; it does not intake the architect's newer art or alter source/clock rules.

## Diagnosis and change

The overlay fault was a DOM ownership collision. The shell used `[data-empty]`, which the real HUD also puts on its tool buttons. Once mounted, a HUD stock button came first in document order, so the shell hid that button instead of the unavailable overlay. The broad `[data-mode]` query also reached the real HUD's gameplay/explore wrapper and added unrelated pressed semantics. The existing hidden CSS rule was sufficient; changing its specificity would not fix the wrong element selection.

The placeholder now has the unique `data-render-empty` marker. Every shell query excludes descendants of the borrowed HUD mount. Native tool stock attributes, visibility and mode semantics remain owned by `mountUI`. Ready/recovery hides the actual placeholder; initialization, actual error and missing-mode states still show it.

Every export action now produces one download. Recording completion saves the video only. Save motion metadata is a separate explicit action, retaining the complete existing metadata and critique/disclosure inclusion. Each JPEG capture has separate Save JPEG and Save evidence JSON controls. There is no permission-prompt workaround, no additional stream, no clock change, and no hardware/quality acceptance inference.

## Focused validation

The 26 Node UI checks pass, including one download per explicit image/metadata command and video completion followed by an explicit metadata request. The DOM regression mounts the real HUD inside the actual review shell, waits for its stylesheet, supplies clearly labelled detached renderer metadata, and inspects computed display/painted boxes. It checks hidden ready/recovered overlays, visible unavailable explanations, all six borrowed HUD buttons and unchanged native mode/ARIA attributes. It also tests the separate download controls. That fixture is DOM evidence, not a WebGL or motion-quality claim.

Computed browser results are recorded after deliberate architect intake through the already-owned primary preview server. This helper starts no server and never controls native Chrome or its permission prompt. The broader animated fire and measured GPU target remain the architect's gate.
