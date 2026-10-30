// Authored native-grid interior plans; regenerate with art/source/landmark-interiors/build-plans.mjs.
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const INTERIOR_PLANS=freeze({
  "new-york": {
    "id": "landmark-interior-new-york-v1",
    "version": 1,
    "venueId": "new-york",
    "units": "metres",
    "occupiedLevels": [
      1,
      4
    ],
    "sourcePins": {
      "building": {
        "commit": "b689f5501ab06f54822f2aa724ac77de106e3b71",
        "path": "assets/art/exposition-new-york-tile/index.js"
      },
      "access": {
        "commit": "26e1b1301ce577ab8ed26afa32fdafa93d7d44e4",
        "path": "assets/art/exploration-access/plans.js"
      }
    },
    "rooms": [
      {
        "id": "ny-l1-west-0",
        "label": "Ladies parlor",
        "level": 1,
        "polygon": [
          [
            -24,
            0
          ],
          [
            -14,
            0
          ],
          [
            -14,
            8
          ],
          [
            -24,
            8
          ]
        ],
        "sourceStatus": "Room functions and adjacency from architect first-floor plan; native quantization.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-west-1",
        "label": "Reception room",
        "level": 1,
        "polygon": [
          [
            -24,
            8
          ],
          [
            -14,
            8
          ],
          [
            -14,
            18
          ],
          [
            -24,
            18
          ]
        ],
        "sourceStatus": "Room functions and adjacency from architect first-floor plan; native quantization.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-west-2",
        "label": "Ladies room",
        "level": 1,
        "polygon": [
          [
            -24,
            18
          ],
          [
            -14,
            18
          ],
          [
            -14,
            28
          ],
          [
            -24,
            28
          ]
        ],
        "sourceStatus": "Room functions and adjacency from architect first-floor plan; native quantization.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-west-front-office",
        "label": "Reception manager",
        "level": 1,
        "polygon": [
          [
            -14,
            0
          ],
          [
            -8,
            0
          ],
          [
            -8,
            8
          ],
          [
            -14,
            8
          ]
        ],
        "sourceStatus": "Native adaptation of labeled first-floor service rooms.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-west-office",
        "label": "Board of General Managers office",
        "level": 4,
        "polygon": [
          [
            -24,
            0
          ],
          [
            -14,
            0
          ],
          [
            -14,
            10
          ],
          [
            -24,
            10
          ]
        ],
        "sourceStatus": "Upper functions from 1894 report; grid plan interpreted.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-west-reception",
        "label": "Upper reception room",
        "level": 4,
        "polygon": [
          [
            -24,
            10
          ],
          [
            -14,
            10
          ],
          [
            -14,
            18
          ],
          [
            -24,
            18
          ]
        ],
        "sourceStatus": "Upper functions documented; exact partition layout unknown.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-west-rear",
        "label": "Relic room",
        "level": 4,
        "polygon": [
          [
            -24,
            18
          ],
          [
            -14,
            18
          ],
          [
            -14,
            28
          ],
          [
            -24,
            28
          ]
        ],
        "sourceStatus": "Upper functions documented; furnishing arrangement interpreted.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-east-0",
        "label": "Gentlemens parlor",
        "level": 1,
        "polygon": [
          [
            14,
            0
          ],
          [
            24,
            0
          ],
          [
            24,
            8
          ],
          [
            14,
            8
          ]
        ],
        "sourceStatus": "Room functions and adjacency from architect first-floor plan; native quantization.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-east-1",
        "label": "Reception room",
        "level": 1,
        "polygon": [
          [
            14,
            8
          ],
          [
            24,
            8
          ],
          [
            24,
            18
          ],
          [
            14,
            18
          ]
        ],
        "sourceStatus": "Room functions and adjacency from architect first-floor plan; native quantization.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-east-2",
        "label": "Smoking room",
        "level": 1,
        "polygon": [
          [
            14,
            18
          ],
          [
            24,
            18
          ],
          [
            24,
            28
          ],
          [
            14,
            28
          ]
        ],
        "sourceStatus": "Room functions and adjacency from architect first-floor plan; native quantization.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-east-front-office",
        "label": "Post and information office",
        "level": 1,
        "polygon": [
          [
            8,
            0
          ],
          [
            14,
            0
          ],
          [
            14,
            8
          ],
          [
            8,
            8
          ]
        ],
        "sourceStatus": "Native adaptation of labeled first-floor service rooms.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-east-office",
        "label": "Board of Women Managers office",
        "level": 4,
        "polygon": [
          [
            14,
            0
          ],
          [
            24,
            0
          ],
          [
            24,
            10
          ],
          [
            14,
            10
          ]
        ],
        "sourceStatus": "Upper functions from 1894 report; grid plan interpreted.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-east-reception",
        "label": "Upper reception room",
        "level": 4,
        "polygon": [
          [
            14,
            10
          ],
          [
            24,
            10
          ],
          [
            24,
            18
          ],
          [
            14,
            18
          ]
        ],
        "sourceStatus": "Upper functions documented; exact partition layout unknown.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-east-rear",
        "label": "Tea room",
        "level": 4,
        "polygon": [
          [
            14,
            18
          ],
          [
            24,
            18
          ],
          [
            24,
            28
          ],
          [
            14,
            28
          ]
        ],
        "sourceStatus": "Upper functions documented; furnishing arrangement interpreted.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-hall",
        "label": "Pillared entrance hall and grand stair approach",
        "level": 1,
        "polygon": [
          [
            -8,
            0
          ],
          [
            8,
            0
          ],
          [
            8,
            28
          ],
          [
            -8,
            28
          ]
        ],
        "sourceStatus": "Plan-derived hall with preserved access stair relocation.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-banquet",
        "label": "Banquet and reception hall",
        "level": 4,
        "polygon": [
          [
            -14,
            0
          ],
          [
            14,
            0
          ],
          [
            14,
            28
          ],
          [
            -14,
            28
          ]
        ],
        "sourceStatus": "Central upper hall documented; table positions are set dressing.",
        "sourceIds": [
          "INT-NY-BANQUET",
          "INT-NY-REPORT"
        ]
      }
    ],
    "walls": [
      {
        "id": "ny-l1-west-spine",
        "a": [
          -14,
          0
        ],
        "b": [
          -14,
          28
        ],
        "startLevel": 1,
        "endLevel": 4,
        "floorLevel": 1,
        "openings": [
          {
            "id": "ny-l1-west-spine-opening-0",
            "x": -10,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "ny-l1-west-spine-opening-1",
            "x": 0,
            "width": 4,
            "height": 4,
            "bottom": 0
          },
          {
            "id": "ny-l1-west-spine-opening-2",
            "x": 10,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "plan-adapted",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-west-cross-8",
        "a": [
          -24,
          8
        ],
        "b": [
          -8,
          8
        ],
        "startLevel": 1,
        "endLevel": 4,
        "floorLevel": 1,
        "openings": [
          {
            "id": "ny-l1-west-cross-8-opening-0",
            "x": -3,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "ny-l1-west-cross-8-opening-1",
            "x": 5,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "plan-adapted",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-west-cross-18",
        "a": [
          -24,
          18
        ],
        "b": [
          -8,
          18
        ],
        "startLevel": 1,
        "endLevel": 4,
        "floorLevel": 1,
        "openings": [
          {
            "id": "ny-l1-west-cross-18-opening-0",
            "x": -3,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "ny-l1-west-cross-18-opening-1",
            "x": 5,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "plan-adapted",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-west-inner-front",
        "a": [
          -8,
          0
        ],
        "b": [
          -8,
          8
        ],
        "startLevel": 1,
        "endLevel": 4,
        "floorLevel": 1,
        "openings": [
          {
            "id": "ny-l1-west-inner-front-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "pompeian",
        "sourceStatus": "plan-adapted",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-west-inner-rear",
        "a": [
          -8,
          18
        ],
        "b": [
          -8,
          28
        ],
        "startLevel": 1,
        "endLevel": 4,
        "floorLevel": 1,
        "openings": [
          {
            "id": "ny-l1-west-inner-rear-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "pompeian",
        "sourceStatus": "plan-adapted",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-west-banquet-side",
        "a": [
          -14,
          0
        ],
        "b": [
          -14,
          28
        ],
        "startLevel": 4,
        "endLevel": 7,
        "floorLevel": 4,
        "openings": [
          {
            "id": "ny-l4-west-banquet-side-opening-0",
            "x": 0,
            "width": 4,
            "height": 4,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "Upper room functions documented; exact subdividing lines interpreted.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-west-office-cross-10",
        "a": [
          -24,
          10
        ],
        "b": [
          -14,
          10
        ],
        "startLevel": 4,
        "endLevel": 7,
        "floorLevel": 4,
        "openings": [
          {
            "id": "ny-l4-west-office-cross-10-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-west-office-cross-18",
        "a": [
          -24,
          18
        ],
        "b": [
          -14,
          18
        ],
        "startLevel": 4,
        "endLevel": 7,
        "floorLevel": 4,
        "openings": [
          {
            "id": "ny-l4-west-office-cross-18-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-east-spine",
        "a": [
          14,
          0
        ],
        "b": [
          14,
          28
        ],
        "startLevel": 1,
        "endLevel": 4,
        "floorLevel": 1,
        "openings": [
          {
            "id": "ny-l1-east-spine-opening-0",
            "x": -10,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "ny-l1-east-spine-opening-1",
            "x": 0,
            "width": 4,
            "height": 4,
            "bottom": 0
          },
          {
            "id": "ny-l1-east-spine-opening-2",
            "x": 10,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "plan-adapted",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-east-cross-8",
        "a": [
          8,
          8
        ],
        "b": [
          24,
          8
        ],
        "startLevel": 1,
        "endLevel": 4,
        "floorLevel": 1,
        "openings": [
          {
            "id": "ny-l1-east-cross-8-opening-0",
            "x": 3,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "ny-l1-east-cross-8-opening-1",
            "x": -5,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "plan-adapted",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-east-cross-18",
        "a": [
          8,
          18
        ],
        "b": [
          24,
          18
        ],
        "startLevel": 1,
        "endLevel": 4,
        "floorLevel": 1,
        "openings": [
          {
            "id": "ny-l1-east-cross-18-opening-0",
            "x": 3,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "ny-l1-east-cross-18-opening-1",
            "x": -5,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "plan-adapted",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-east-inner-front",
        "a": [
          8,
          0
        ],
        "b": [
          8,
          8
        ],
        "startLevel": 1,
        "endLevel": 4,
        "floorLevel": 1,
        "openings": [
          {
            "id": "ny-l1-east-inner-front-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "pompeian",
        "sourceStatus": "plan-adapted",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l1-east-inner-rear",
        "a": [
          8,
          18
        ],
        "b": [
          8,
          28
        ],
        "startLevel": 1,
        "endLevel": 4,
        "floorLevel": 1,
        "openings": [
          {
            "id": "ny-l1-east-inner-rear-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "pompeian",
        "sourceStatus": "plan-adapted",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-east-banquet-side",
        "a": [
          14,
          0
        ],
        "b": [
          14,
          28
        ],
        "startLevel": 4,
        "endLevel": 7,
        "floorLevel": 4,
        "openings": [
          {
            "id": "ny-l4-east-banquet-side-opening-0",
            "x": 0,
            "width": 4,
            "height": 4,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "Upper room functions documented; exact subdividing lines interpreted.",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-east-office-cross-10",
        "a": [
          14,
          10
        ],
        "b": [
          24,
          10
        ],
        "startLevel": 4,
        "endLevel": 7,
        "floorLevel": 4,
        "openings": [
          {
            "id": "ny-l4-east-office-cross-10-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-l4-east-office-cross-18",
        "a": [
          14,
          18
        ],
        "b": [
          24,
          18
        ],
        "startLevel": 4,
        "endLevel": 7,
        "floorLevel": 4,
        "openings": [
          {
            "id": "ny-l4-east-office-cross-18-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-NY-REPORT"
        ]
      }
    ],
    "props": [
      {
        "id": "ny-west-manager-desk",
        "assetId": "writing-desk",
        "x": -11,
        "z": 2.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l1-west-front-office",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "ny-west-manager-chair",
        "assetId": "clerk-chair",
        "x": -11,
        "z": 3.4,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l1-west-front-office",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "ny-west-settee-3",
        "assetId": "renaissance-settee",
        "x": -19,
        "z": 3,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l1-west-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-west-rug-3",
        "assetId": "rug",
        "x": -19,
        "z": 4.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-west-settee-25",
        "assetId": "renaissance-settee",
        "x": -19,
        "z": 25,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l1-west-2",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-west-rug-25",
        "assetId": "rug",
        "x": -19,
        "z": 23.8,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-west-reception-chair-a",
        "assetId": "renaissance-armchair",
        "x": -22,
        "z": 10.5,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.570796,
        "roomId": "ny-l1-west-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-west-reception-chair-b",
        "assetId": "renaissance-armchair",
        "x": -17,
        "z": 17,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l1-west-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-west-chimneypiece",
        "assetId": "marble-fireplace",
        "x": -14.5,
        "z": 20.4,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "ny-l1-west-2",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-upper-west-desk",
        "assetId": "writing-desk",
        "x": -19,
        "z": 4,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-west-office",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "ny-upper-west-chair",
        "assetId": "renaissance-armchair",
        "x": -19,
        "z": 5.4,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-west-office",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-upper-west-books",
        "assetId": "ledger-bookcase",
        "x": -21.5,
        "z": 8.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-west-office",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-upper-west-settee",
        "assetId": "renaissance-settee",
        "x": -21,
        "z": 16.3,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-west-reception",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-upper-west-rear-17",
        "assetId": "display-case",
        "x": -17,
        "z": 23,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-west-rear",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "ny-upper-west-rear-21",
        "assetId": "display-case",
        "x": -21,
        "z": 23,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-west-rear",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "ny-east-manager-desk",
        "assetId": "writing-desk",
        "x": 11,
        "z": 2.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l1-east-front-office",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "ny-east-manager-chair",
        "assetId": "clerk-chair",
        "x": 11,
        "z": 3.4,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l1-east-front-office",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "ny-post-sorting",
        "assetId": "pigeonhole-cabinet",
        "x": 12.4,
        "z": 6.7,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "ny-l1-east-front-office",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "ny-east-settee-3",
        "assetId": "renaissance-settee",
        "x": 19,
        "z": 3,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l1-east-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-east-rug-3",
        "assetId": "rug",
        "x": 19,
        "z": 4.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-east-settee-25",
        "assetId": "renaissance-settee",
        "x": 19,
        "z": 25,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l1-east-2",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-east-rug-25",
        "assetId": "rug",
        "x": 19,
        "z": 23.8,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-east-reception-chair-a",
        "assetId": "renaissance-armchair",
        "x": 22,
        "z": 10.5,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "ny-l1-east-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-east-reception-chair-b",
        "assetId": "renaissance-armchair",
        "x": 17,
        "z": 17,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l1-east-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-east-chimneypiece",
        "assetId": "marble-fireplace",
        "x": 14.5,
        "z": 20.4,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.570796,
        "roomId": "ny-l1-east-2",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-upper-east-desk",
        "assetId": "writing-desk",
        "x": 19,
        "z": 4,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-east-office",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "ny-upper-east-chair",
        "assetId": "renaissance-armchair",
        "x": 19,
        "z": 5.4,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-east-office",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-upper-east-books",
        "assetId": "ledger-bookcase",
        "x": 21.5,
        "z": 8.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-east-office",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-upper-east-settee",
        "assetId": "renaissance-settee",
        "x": 21,
        "z": 16.3,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-east-reception",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-upper-east-rear-17",
        "assetId": "cafe-table-set",
        "x": 17,
        "z": 23,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-east-rear",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "ny-upper-east-rear-21",
        "assetId": "cafe-table-set",
        "x": 21,
        "z": 23,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-east-rear",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "ny-banquet-table--9-7",
        "assetId": "banquet-table",
        "x": -9,
        "z": 7,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-7--1--1.2",
        "assetId": "renaissance-armchair",
        "x": -10,
        "z": 5.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-7--1-1.2",
        "assetId": "renaissance-armchair",
        "x": -10,
        "z": 8.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-7-0--1.2",
        "assetId": "renaissance-armchair",
        "x": -9,
        "z": 5.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-7-0-1.2",
        "assetId": "renaissance-armchair",
        "x": -9,
        "z": 8.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-7-1--1.2",
        "assetId": "renaissance-armchair",
        "x": -8,
        "z": 5.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-7-1-1.2",
        "assetId": "renaissance-armchair",
        "x": -8,
        "z": 8.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-table--9-21",
        "assetId": "banquet-table",
        "x": -9,
        "z": 21,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-21--1--1.2",
        "assetId": "renaissance-armchair",
        "x": -10,
        "z": 19.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-21--1-1.2",
        "assetId": "renaissance-armchair",
        "x": -10,
        "z": 22.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-21-0--1.2",
        "assetId": "renaissance-armchair",
        "x": -9,
        "z": 19.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-21-0-1.2",
        "assetId": "renaissance-armchair",
        "x": -9,
        "z": 22.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-21-1--1.2",
        "assetId": "renaissance-armchair",
        "x": -8,
        "z": 19.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair--9-21-1-1.2",
        "assetId": "renaissance-armchair",
        "x": -8,
        "z": 22.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-table-9-7",
        "assetId": "banquet-table",
        "x": 9,
        "z": 7,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-7--1--1.2",
        "assetId": "renaissance-armchair",
        "x": 8,
        "z": 5.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-7--1-1.2",
        "assetId": "renaissance-armchair",
        "x": 8,
        "z": 8.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-7-0--1.2",
        "assetId": "renaissance-armchair",
        "x": 9,
        "z": 5.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-7-0-1.2",
        "assetId": "renaissance-armchair",
        "x": 9,
        "z": 8.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-7-1--1.2",
        "assetId": "renaissance-armchair",
        "x": 10,
        "z": 5.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-7-1-1.2",
        "assetId": "renaissance-armchair",
        "x": 10,
        "z": 8.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-table-9-21",
        "assetId": "banquet-table",
        "x": 9,
        "z": 21,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-21--1--1.2",
        "assetId": "renaissance-armchair",
        "x": 8,
        "z": 19.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-21--1-1.2",
        "assetId": "renaissance-armchair",
        "x": 8,
        "z": 22.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-21-0--1.2",
        "assetId": "renaissance-armchair",
        "x": 9,
        "z": 19.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-21-0-1.2",
        "assetId": "renaissance-armchair",
        "x": 9,
        "z": 22.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-21-1--1.2",
        "assetId": "renaissance-armchair",
        "x": 10,
        "z": 19.8,
        "level": 4,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chair-9-21-1-1.2",
        "assetId": "renaissance-armchair",
        "x": 10,
        "z": 22.2,
        "level": 4,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chandelier--9-7",
        "assetId": "electric-chandelier",
        "x": -9,
        "z": 7,
        "level": 4,
        "yOffset": 4.093,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chandelier--9-21",
        "assetId": "electric-chandelier",
        "x": -9,
        "z": 21,
        "level": 4,
        "yOffset": 4.093,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chandelier-9-7",
        "assetId": "electric-chandelier",
        "x": 9,
        "z": 7,
        "level": 4,
        "yOffset": 4.093,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-banquet-chandelier-9-21",
        "assetId": "electric-chandelier",
        "x": 9,
        "z": 21,
        "level": 4,
        "yOffset": 4.093,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "ny-ceiling--10-4",
        "assetId": "coffer-panel",
        "x": -10,
        "z": 4,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--10-8",
        "assetId": "coffer-panel",
        "x": -10,
        "z": 8,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--10-12",
        "assetId": "coffer-panel",
        "x": -10,
        "z": 12,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--10-16",
        "assetId": "coffer-panel",
        "x": -10,
        "z": 16,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--10-20",
        "assetId": "coffer-panel",
        "x": -10,
        "z": 20,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--10-24",
        "assetId": "coffer-panel",
        "x": -10,
        "z": 24,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--6-4",
        "assetId": "coffer-panel",
        "x": -6,
        "z": 4,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--6-8",
        "assetId": "coffer-panel",
        "x": -6,
        "z": 8,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--6-12",
        "assetId": "coffer-panel",
        "x": -6,
        "z": 12,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--6-16",
        "assetId": "coffer-panel",
        "x": -6,
        "z": 16,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--6-20",
        "assetId": "coffer-panel",
        "x": -6,
        "z": 20,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--6-24",
        "assetId": "coffer-panel",
        "x": -6,
        "z": 24,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--2-4",
        "assetId": "coffer-panel",
        "x": -2,
        "z": 4,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--2-8",
        "assetId": "coffer-panel",
        "x": -2,
        "z": 8,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--2-12",
        "assetId": "coffer-panel",
        "x": -2,
        "z": 12,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--2-16",
        "assetId": "coffer-panel",
        "x": -2,
        "z": 16,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--2-20",
        "assetId": "coffer-panel",
        "x": -2,
        "z": 20,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling--2-24",
        "assetId": "coffer-panel",
        "x": -2,
        "z": 24,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-2-4",
        "assetId": "coffer-panel",
        "x": 2,
        "z": 4,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-2-8",
        "assetId": "coffer-panel",
        "x": 2,
        "z": 8,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-2-12",
        "assetId": "coffer-panel",
        "x": 2,
        "z": 12,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-2-16",
        "assetId": "coffer-panel",
        "x": 2,
        "z": 16,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-2-20",
        "assetId": "coffer-panel",
        "x": 2,
        "z": 20,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-2-24",
        "assetId": "coffer-panel",
        "x": 2,
        "z": 24,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-6-4",
        "assetId": "coffer-panel",
        "x": 6,
        "z": 4,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-6-8",
        "assetId": "coffer-panel",
        "x": 6,
        "z": 8,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-6-12",
        "assetId": "coffer-panel",
        "x": 6,
        "z": 12,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-6-16",
        "assetId": "coffer-panel",
        "x": 6,
        "z": 16,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-6-20",
        "assetId": "coffer-panel",
        "x": 6,
        "z": 20,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-6-24",
        "assetId": "coffer-panel",
        "x": 6,
        "z": 24,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-10-4",
        "assetId": "coffer-panel",
        "x": 10,
        "z": 4,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-10-8",
        "assetId": "coffer-panel",
        "x": 10,
        "z": 8,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-10-12",
        "assetId": "coffer-panel",
        "x": 10,
        "z": 12,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-10-16",
        "assetId": "coffer-panel",
        "x": 10,
        "z": 16,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-10-20",
        "assetId": "coffer-panel",
        "x": 10,
        "z": 20,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-ceiling-10-24",
        "assetId": "coffer-panel",
        "x": 10,
        "z": 24,
        "level": 4,
        "yOffset": 6.01,
        "yaw": 0,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET"
        ]
      },
      {
        "id": "ny-upper-panel--13.76-4",
        "assetId": "classical-wall-panel",
        "x": -13.76,
        "z": 4,
        "level": 4,
        "yOffset": 2.9,
        "yaw": -1.570796,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET",
          "INT-ADMIN-DOME"
        ]
      },
      {
        "id": "ny-upper-panel--13.76-8",
        "assetId": "classical-wall-panel",
        "x": -13.76,
        "z": 8,
        "level": 4,
        "yOffset": 2.9,
        "yaw": -1.570796,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET",
          "INT-ADMIN-DOME"
        ]
      },
      {
        "id": "ny-upper-panel--13.76-20",
        "assetId": "classical-wall-panel",
        "x": -13.76,
        "z": 20,
        "level": 4,
        "yOffset": 2.9,
        "yaw": -1.570796,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET",
          "INT-ADMIN-DOME"
        ]
      },
      {
        "id": "ny-upper-panel--13.76-24",
        "assetId": "classical-wall-panel",
        "x": -13.76,
        "z": 24,
        "level": 4,
        "yOffset": 2.9,
        "yaw": -1.570796,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET",
          "INT-ADMIN-DOME"
        ]
      },
      {
        "id": "ny-upper-panel-13.76-4",
        "assetId": "classical-wall-panel",
        "x": 13.76,
        "z": 4,
        "level": 4,
        "yOffset": 2.9,
        "yaw": 1.570796,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET",
          "INT-ADMIN-DOME"
        ]
      },
      {
        "id": "ny-upper-panel-13.76-8",
        "assetId": "classical-wall-panel",
        "x": 13.76,
        "z": 8,
        "level": 4,
        "yOffset": 2.9,
        "yaw": 1.570796,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET",
          "INT-ADMIN-DOME"
        ]
      },
      {
        "id": "ny-upper-panel-13.76-20",
        "assetId": "classical-wall-panel",
        "x": 13.76,
        "z": 20,
        "level": 4,
        "yOffset": 2.9,
        "yaw": 1.570796,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET",
          "INT-ADMIN-DOME"
        ]
      },
      {
        "id": "ny-upper-panel-13.76-24",
        "assetId": "classical-wall-panel",
        "x": 13.76,
        "z": 24,
        "level": 4,
        "yOffset": 2.9,
        "yaw": 1.570796,
        "roomId": "ny-l4-banquet",
        "sourceIds": [
          "INT-NY-BANQUET",
          "INT-ADMIN-DOME"
        ]
      }
    ],
    "portals": [
      {
        "id": "ny-l1-west-spine-opening-0",
        "runId": "ny-l1-west-spine",
        "level": 1,
        "position": [
          -14,
          2.12,
          4
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-west-spine-opening-1",
        "runId": "ny-l1-west-spine",
        "level": 1,
        "position": [
          -14,
          2.12,
          14
        ],
        "heading": -1.570796,
        "clearWidth": 4,
        "clearHeight": 4,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-west-spine-opening-2",
        "runId": "ny-l1-west-spine",
        "level": 1,
        "position": [
          -14,
          2.12,
          24
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-west-cross-8-opening-0",
        "runId": "ny-l1-west-cross-8",
        "level": 1,
        "position": [
          -19,
          2.12,
          8
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-west-cross-8-opening-1",
        "runId": "ny-l1-west-cross-8",
        "level": 1,
        "position": [
          -11,
          2.12,
          8
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-west-cross-18-opening-0",
        "runId": "ny-l1-west-cross-18",
        "level": 1,
        "position": [
          -19,
          2.12,
          18
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-west-cross-18-opening-1",
        "runId": "ny-l1-west-cross-18",
        "level": 1,
        "position": [
          -11,
          2.12,
          18
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-west-inner-front-opening-0",
        "runId": "ny-l1-west-inner-front",
        "level": 1,
        "position": [
          -8,
          2.12,
          4
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-west-inner-rear-opening-0",
        "runId": "ny-l1-west-inner-rear",
        "level": 1,
        "position": [
          -8,
          2.12,
          23
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l4-west-banquet-side-opening-0",
        "runId": "ny-l4-west-banquet-side",
        "level": 4,
        "position": [
          -14,
          8.48,
          14
        ],
        "heading": -1.570796,
        "clearWidth": 4,
        "clearHeight": 4,
        "stateful": false,
        "sourceStatus": "Upper room functions documented; exact subdividing lines interpreted."
      },
      {
        "id": "ny-l4-west-office-cross-10-opening-0",
        "runId": "ny-l4-west-office-cross-10",
        "level": 4,
        "position": [
          -19,
          8.48,
          10
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "ny-l4-west-office-cross-18-opening-0",
        "runId": "ny-l4-west-office-cross-18",
        "level": 4,
        "position": [
          -19,
          8.48,
          18
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "ny-l1-east-spine-opening-0",
        "runId": "ny-l1-east-spine",
        "level": 1,
        "position": [
          14,
          2.12,
          4
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-east-spine-opening-1",
        "runId": "ny-l1-east-spine",
        "level": 1,
        "position": [
          14,
          2.12,
          14
        ],
        "heading": -1.570796,
        "clearWidth": 4,
        "clearHeight": 4,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-east-spine-opening-2",
        "runId": "ny-l1-east-spine",
        "level": 1,
        "position": [
          14,
          2.12,
          24
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-east-cross-8-opening-0",
        "runId": "ny-l1-east-cross-8",
        "level": 1,
        "position": [
          19,
          2.12,
          8
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-east-cross-8-opening-1",
        "runId": "ny-l1-east-cross-8",
        "level": 1,
        "position": [
          11,
          2.12,
          8
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-east-cross-18-opening-0",
        "runId": "ny-l1-east-cross-18",
        "level": 1,
        "position": [
          19,
          2.12,
          18
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-east-cross-18-opening-1",
        "runId": "ny-l1-east-cross-18",
        "level": 1,
        "position": [
          11,
          2.12,
          18
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-east-inner-front-opening-0",
        "runId": "ny-l1-east-inner-front",
        "level": 1,
        "position": [
          8,
          2.12,
          4
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l1-east-inner-rear-opening-0",
        "runId": "ny-l1-east-inner-rear",
        "level": 1,
        "position": [
          8,
          2.12,
          23
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "plan-adapted"
      },
      {
        "id": "ny-l4-east-banquet-side-opening-0",
        "runId": "ny-l4-east-banquet-side",
        "level": 4,
        "position": [
          14,
          8.48,
          14
        ],
        "heading": -1.570796,
        "clearWidth": 4,
        "clearHeight": 4,
        "stateful": false,
        "sourceStatus": "Upper room functions documented; exact subdividing lines interpreted."
      },
      {
        "id": "ny-l4-east-office-cross-10-opening-0",
        "runId": "ny-l4-east-office-cross-10",
        "level": 4,
        "position": [
          19,
          8.48,
          10
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "ny-l4-east-office-cross-18-opening-0",
        "runId": "ny-l4-east-office-cross-18",
        "level": 4,
        "position": [
          19,
          8.48,
          18
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      }
    ],
    "reservedRoutes": [
      {
        "id": "ny-main-crosshall",
        "level": 1,
        "points": [
          [
            -24,
            14
          ],
          [
            24,
            14
          ]
        ],
        "width": 2.4,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "ny-front-stair-approach",
        "level": 1,
        "points": [
          [
            0,
            0
          ],
          [
            0,
            3
          ],
          [
            -4.5,
            6.4
          ],
          [
            -4.5,
            8
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "ny-upper-crosshall",
        "level": 4,
        "points": [
          [
            -24,
            14
          ],
          [
            -7,
            14
          ],
          [
            -7,
            16
          ],
          [
            3,
            16
          ],
          [
            3,
            14
          ],
          [
            24,
            14
          ]
        ],
        "width": 1.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "ny-upper-stair-arrival",
        "level": 4,
        "points": [
          [
            -1.5,
            4
          ],
          [
            -1.5,
            2
          ],
          [
            3,
            2
          ],
          [
            3,
            14
          ],
          [
            3,
            27
          ]
        ],
        "width": 1.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      }
    ],
    "replacements": {
      "hiddenSourceParts": []
    },
    "notes": [
      "First-floor room divisions follow the architect plate, quantized to this existing 48 m shell. Upper left/right functions follow the report; precise upper partitions remain an interpretation.",
      "The existing access stair occupies a different position from the historical central stair. Its complete source-local stairwell and arrival are preserved; no new floor slabs or changes in floor height.",
      "New partitions have permanent open framed passages. Door interaction and collision are deferred to the coder; no door leaf or invisible barrier is implied.",
      "The cream/gold and Pompeian orange-red schemes are supported by the 1894 description. Exact tapestries, mythological figures, zodiac brass pavement and Millet ceiling painting are not reproduced.",
      "Source-local +X right, +Z rear, +Y up; structural floors stay on 2.12 m native levels. Furniture dimensions are metres and are not stretched to grid sizes.",
      "Physical collision/fuel/material assignments and game integration remain consumer-owned. Room labels and route keepouts are descriptive evidence, not proof of runtime traversal."
    ],
    "prototypeIds": [
      "writing-desk",
      "clerk-chair",
      "renaissance-settee",
      "rug",
      "renaissance-armchair",
      "marble-fireplace",
      "ledger-bookcase",
      "display-case",
      "pigeonhole-cabinet",
      "cafe-table-set",
      "banquet-table",
      "electric-chandelier",
      "coffer-panel",
      "classical-wall-panel"
    ]
  },
  "administration": {
    "id": "landmark-interior-administration-v1",
    "version": 1,
    "venueId": "administration",
    "units": "metres",
    "occupiedLevels": [
      1,
      3,
      5,
      7
    ],
    "sourcePins": {
      "building": {
        "commit": "43337a33ddfe4dff6849654c827c56e1f24e1acc",
        "path": "assets/art/exposition-administration/index.js"
      },
      "access": {
        "commit": "26e1b1301ce577ab8ed26afa32fdafa93d7d44e4",
        "path": "assets/art/exploration-access/plans.js"
      }
    },
    "rooms": [
      {
        "id": "admin-west-public",
        "label": "Public waiting room",
        "level": 1,
        "polygon": [
          [
            -40,
            0
          ],
          [
            -30,
            0
          ],
          [
            -30,
            12
          ],
          [
            -40,
            12
          ]
        ],
        "sourceStatus": "Existing source-supported front room; structural walls retained.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-post",
        "label": "Post office",
        "level": 1,
        "polygon": [
          [
            -30,
            0
          ],
          [
            -14,
            0
          ],
          [
            -14,
            12
          ],
          [
            -30,
            12
          ]
        ],
        "sourceStatus": "Existing source-supported front room; structural walls retained.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-exchange",
        "label": "Exchange",
        "level": 1,
        "polygon": [
          [
            -40,
            12
          ],
          [
            -26,
            12
          ],
          [
            -26,
            26
          ],
          [
            -40,
            26
          ]
        ],
        "sourceStatus": "Existing source-supported front room; structural walls retained.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-foyer",
        "label": "Ante-room",
        "level": 1,
        "polygon": [
          [
            -26,
            12
          ],
          [
            -14,
            12
          ],
          [
            -14,
            20
          ],
          [
            -26,
            20
          ]
        ],
        "sourceStatus": "Existing source-supported front room; structural walls retained.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-vault",
        "label": "Vault",
        "level": 1,
        "polygon": [
          [
            -26,
            20
          ],
          [
            -20,
            20
          ],
          [
            -20,
            26
          ],
          [
            -26,
            26
          ]
        ],
        "sourceStatus": "Existing source-supported front room; structural walls retained.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-foreign",
        "label": "Foreign visitors office",
        "level": 1,
        "polygon": [
          [
            14,
            0
          ],
          [
            20,
            0
          ],
          [
            20,
            12
          ],
          [
            14,
            12
          ]
        ],
        "sourceStatus": "Existing source-supported front room; structural walls retained.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-information",
        "label": "Information office",
        "level": 1,
        "polygon": [
          [
            20,
            0
          ],
          [
            28,
            0
          ],
          [
            28,
            12
          ],
          [
            20,
            12
          ]
        ],
        "sourceStatus": "Existing source-supported front room; structural walls retained.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-ambulance",
        "label": "Ambulance service",
        "level": 1,
        "polygon": [
          [
            28,
            0
          ],
          [
            40,
            0
          ],
          [
            40,
            12
          ],
          [
            28,
            12
          ]
        ],
        "sourceStatus": "Existing source-supported front room; structural walls retained.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-doctor",
        "label": "Doctor",
        "level": 1,
        "polygon": [
          [
            28,
            12
          ],
          [
            34,
            12
          ],
          [
            34,
            26
          ],
          [
            28,
            26
          ]
        ],
        "sourceStatus": "Existing source-supported front room; structural walls retained.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-pharmacy",
        "label": "Pharmacy",
        "level": 1,
        "polygon": [
          [
            34,
            12
          ],
          [
            40,
            12
          ],
          [
            40,
            26
          ],
          [
            34,
            26
          ]
        ],
        "sourceStatus": "Existing source-supported front room; structural walls retained.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l1-room-0",
        "label": "Clerical office",
        "level": 1,
        "polygon": [
          [
            -40,
            54
          ],
          [
            -22,
            54
          ],
          [
            -22,
            67
          ],
          [
            -40,
            67
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l1-room-1",
        "label": "Records office",
        "level": 1,
        "polygon": [
          [
            -40,
            67
          ],
          [
            -22,
            67
          ],
          [
            -22,
            80
          ],
          [
            -40,
            80
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l1-room-0",
        "label": "Clerical office",
        "level": 1,
        "polygon": [
          [
            22,
            54
          ],
          [
            40,
            54
          ],
          [
            40,
            67
          ],
          [
            22,
            67
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l1-room-1",
        "label": "Records office",
        "level": 1,
        "polygon": [
          [
            22,
            67
          ],
          [
            40,
            67
          ],
          [
            40,
            80
          ],
          [
            22,
            80
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l3-room-0",
        "label": "Clerical office",
        "level": 3,
        "polygon": [
          [
            -40,
            0
          ],
          [
            -22,
            0
          ],
          [
            -22,
            13
          ],
          [
            -40,
            13
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l3-room-1",
        "label": "Records office",
        "level": 3,
        "polygon": [
          [
            -40,
            13
          ],
          [
            -22,
            13
          ],
          [
            -22,
            26
          ],
          [
            -40,
            26
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l3-room-0",
        "label": "Clerical office",
        "level": 3,
        "polygon": [
          [
            -40,
            54
          ],
          [
            -22,
            54
          ],
          [
            -22,
            67
          ],
          [
            -40,
            67
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l3-room-1",
        "label": "Records office",
        "level": 3,
        "polygon": [
          [
            -40,
            67
          ],
          [
            -22,
            67
          ],
          [
            -22,
            80
          ],
          [
            -40,
            80
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l3-room-0",
        "label": "Clerical office",
        "level": 3,
        "polygon": [
          [
            22,
            0
          ],
          [
            40,
            0
          ],
          [
            40,
            13
          ],
          [
            22,
            13
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l3-room-1",
        "label": "Records office",
        "level": 3,
        "polygon": [
          [
            22,
            13
          ],
          [
            40,
            13
          ],
          [
            40,
            26
          ],
          [
            22,
            26
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l3-room-0",
        "label": "Clerical office",
        "level": 3,
        "polygon": [
          [
            22,
            54
          ],
          [
            40,
            54
          ],
          [
            40,
            67
          ],
          [
            22,
            67
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l3-room-1",
        "label": "Records office",
        "level": 3,
        "polygon": [
          [
            22,
            67
          ],
          [
            40,
            67
          ],
          [
            40,
            80
          ],
          [
            22,
            80
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l5-room-0",
        "label": "Clerical office",
        "level": 5,
        "polygon": [
          [
            -40,
            0
          ],
          [
            -22,
            0
          ],
          [
            -22,
            13
          ],
          [
            -40,
            13
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l5-room-1",
        "label": "Records office",
        "level": 5,
        "polygon": [
          [
            -40,
            13
          ],
          [
            -22,
            13
          ],
          [
            -22,
            26
          ],
          [
            -40,
            26
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l5-room-0",
        "label": "Clerical office",
        "level": 5,
        "polygon": [
          [
            -40,
            54
          ],
          [
            -22,
            54
          ],
          [
            -22,
            67
          ],
          [
            -40,
            67
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l5-room-1",
        "label": "Records office",
        "level": 5,
        "polygon": [
          [
            -40,
            67
          ],
          [
            -22,
            67
          ],
          [
            -22,
            80
          ],
          [
            -40,
            80
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l5-room-0",
        "label": "Clerical office",
        "level": 5,
        "polygon": [
          [
            22,
            0
          ],
          [
            40,
            0
          ],
          [
            40,
            13
          ],
          [
            22,
            13
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l5-room-1",
        "label": "Records office",
        "level": 5,
        "polygon": [
          [
            22,
            13
          ],
          [
            40,
            13
          ],
          [
            40,
            26
          ],
          [
            22,
            26
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l5-room-0",
        "label": "Clerical office",
        "level": 5,
        "polygon": [
          [
            22,
            54
          ],
          [
            40,
            54
          ],
          [
            40,
            67
          ],
          [
            22,
            67
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l5-room-1",
        "label": "Records office",
        "level": 5,
        "polygon": [
          [
            22,
            67
          ],
          [
            40,
            67
          ],
          [
            40,
            80
          ],
          [
            22,
            80
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l7-room-0",
        "label": "Clerical office",
        "level": 7,
        "polygon": [
          [
            -40,
            0
          ],
          [
            -22,
            0
          ],
          [
            -22,
            13
          ],
          [
            -40,
            13
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l7-room-1",
        "label": "Records office",
        "level": 7,
        "polygon": [
          [
            -40,
            13
          ],
          [
            -22,
            13
          ],
          [
            -22,
            26
          ],
          [
            -40,
            26
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l7-room-0",
        "label": "Clerical office",
        "level": 7,
        "polygon": [
          [
            -40,
            54
          ],
          [
            -22,
            54
          ],
          [
            -22,
            67
          ],
          [
            -40,
            67
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l7-room-1",
        "label": "Records office",
        "level": 7,
        "polygon": [
          [
            -40,
            67
          ],
          [
            -22,
            67
          ],
          [
            -22,
            80
          ],
          [
            -40,
            80
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l7-room-0",
        "label": "Clerical office",
        "level": 7,
        "polygon": [
          [
            22,
            0
          ],
          [
            40,
            0
          ],
          [
            40,
            13
          ],
          [
            22,
            13
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l7-room-1",
        "label": "Records office",
        "level": 7,
        "polygon": [
          [
            22,
            13
          ],
          [
            40,
            13
          ],
          [
            40,
            26
          ],
          [
            22,
            26
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l7-room-0",
        "label": "Clerical office",
        "level": 7,
        "polygon": [
          [
            22,
            54
          ],
          [
            40,
            54
          ],
          [
            40,
            67
          ],
          [
            22,
            67
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l7-room-1",
        "label": "Records office",
        "level": 7,
        "polygon": [
          [
            22,
            67
          ],
          [
            40,
            67
          ],
          [
            40,
            80
          ],
          [
            22,
            80
          ]
        ],
        "sourceStatus": "Functions and upper/rear subdivisions are period interpretations; no complete as-built office plan was inspected.",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      }
    ],
    "walls": [
      {
        "id": "admin-west-rear-corridor-l1",
        "a": [
          -22,
          54
        ],
        "b": [
          -22,
          80
        ],
        "startLevel": 1,
        "endLevel": 3,
        "floorLevel": 1,
        "openings": [
          {
            "id": "admin-west-rear-corridor-l1-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-west-rear-corridor-l1-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-office-cross-l1",
        "a": [
          -40,
          67
        ],
        "b": [
          -22,
          67
        ],
        "startLevel": 1,
        "endLevel": 3,
        "floorLevel": 1,
        "openings": [
          {
            "id": "admin-west-rear-office-cross-l1-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-corridor-l1",
        "a": [
          22,
          54
        ],
        "b": [
          22,
          80
        ],
        "startLevel": 1,
        "endLevel": 3,
        "floorLevel": 1,
        "openings": [
          {
            "id": "admin-east-rear-corridor-l1-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-east-rear-corridor-l1-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-office-cross-l1",
        "a": [
          22,
          67
        ],
        "b": [
          40,
          67
        ],
        "startLevel": 1,
        "endLevel": 3,
        "floorLevel": 1,
        "openings": [
          {
            "id": "admin-east-rear-office-cross-l1-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-corridor-l3",
        "a": [
          -22,
          0
        ],
        "b": [
          -22,
          26
        ],
        "startLevel": 3,
        "endLevel": 5,
        "floorLevel": 3,
        "openings": [
          {
            "id": "admin-west-front-corridor-l3-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-west-front-corridor-l3-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-office-cross-l3",
        "a": [
          -40,
          13
        ],
        "b": [
          -22,
          13
        ],
        "startLevel": 3,
        "endLevel": 5,
        "floorLevel": 3,
        "openings": [
          {
            "id": "admin-west-front-office-cross-l3-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-corridor-l3",
        "a": [
          -22,
          54
        ],
        "b": [
          -22,
          80
        ],
        "startLevel": 3,
        "endLevel": 5,
        "floorLevel": 3,
        "openings": [
          {
            "id": "admin-west-rear-corridor-l3-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-west-rear-corridor-l3-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-office-cross-l3",
        "a": [
          -40,
          67
        ],
        "b": [
          -22,
          67
        ],
        "startLevel": 3,
        "endLevel": 5,
        "floorLevel": 3,
        "openings": [
          {
            "id": "admin-west-rear-office-cross-l3-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-corridor-l3",
        "a": [
          22,
          0
        ],
        "b": [
          22,
          26
        ],
        "startLevel": 3,
        "endLevel": 5,
        "floorLevel": 3,
        "openings": [
          {
            "id": "admin-east-front-corridor-l3-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-east-front-corridor-l3-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-office-cross-l3",
        "a": [
          22,
          13
        ],
        "b": [
          40,
          13
        ],
        "startLevel": 3,
        "endLevel": 5,
        "floorLevel": 3,
        "openings": [
          {
            "id": "admin-east-front-office-cross-l3-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-corridor-l3",
        "a": [
          22,
          54
        ],
        "b": [
          22,
          80
        ],
        "startLevel": 3,
        "endLevel": 5,
        "floorLevel": 3,
        "openings": [
          {
            "id": "admin-east-rear-corridor-l3-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-east-rear-corridor-l3-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-office-cross-l3",
        "a": [
          22,
          67
        ],
        "b": [
          40,
          67
        ],
        "startLevel": 3,
        "endLevel": 5,
        "floorLevel": 3,
        "openings": [
          {
            "id": "admin-east-rear-office-cross-l3-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-corridor-l5",
        "a": [
          -22,
          0
        ],
        "b": [
          -22,
          26
        ],
        "startLevel": 5,
        "endLevel": 7,
        "floorLevel": 5,
        "openings": [
          {
            "id": "admin-west-front-corridor-l5-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-west-front-corridor-l5-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-office-cross-l5",
        "a": [
          -40,
          13
        ],
        "b": [
          -22,
          13
        ],
        "startLevel": 5,
        "endLevel": 7,
        "floorLevel": 5,
        "openings": [
          {
            "id": "admin-west-front-office-cross-l5-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-corridor-l5",
        "a": [
          -22,
          54
        ],
        "b": [
          -22,
          80
        ],
        "startLevel": 5,
        "endLevel": 7,
        "floorLevel": 5,
        "openings": [
          {
            "id": "admin-west-rear-corridor-l5-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-west-rear-corridor-l5-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-office-cross-l5",
        "a": [
          -40,
          67
        ],
        "b": [
          -22,
          67
        ],
        "startLevel": 5,
        "endLevel": 7,
        "floorLevel": 5,
        "openings": [
          {
            "id": "admin-west-rear-office-cross-l5-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-corridor-l5",
        "a": [
          22,
          0
        ],
        "b": [
          22,
          26
        ],
        "startLevel": 5,
        "endLevel": 7,
        "floorLevel": 5,
        "openings": [
          {
            "id": "admin-east-front-corridor-l5-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-east-front-corridor-l5-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-office-cross-l5",
        "a": [
          22,
          13
        ],
        "b": [
          40,
          13
        ],
        "startLevel": 5,
        "endLevel": 7,
        "floorLevel": 5,
        "openings": [
          {
            "id": "admin-east-front-office-cross-l5-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-corridor-l5",
        "a": [
          22,
          54
        ],
        "b": [
          22,
          80
        ],
        "startLevel": 5,
        "endLevel": 7,
        "floorLevel": 5,
        "openings": [
          {
            "id": "admin-east-rear-corridor-l5-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-east-rear-corridor-l5-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-office-cross-l5",
        "a": [
          22,
          67
        ],
        "b": [
          40,
          67
        ],
        "startLevel": 5,
        "endLevel": 7,
        "floorLevel": 5,
        "openings": [
          {
            "id": "admin-east-rear-office-cross-l5-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-corridor-l7",
        "a": [
          -22,
          0
        ],
        "b": [
          -22,
          26
        ],
        "startLevel": 7,
        "endLevel": 9,
        "floorLevel": 7,
        "openings": [
          {
            "id": "admin-west-front-corridor-l7-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-west-front-corridor-l7-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-office-cross-l7",
        "a": [
          -40,
          13
        ],
        "b": [
          -22,
          13
        ],
        "startLevel": 7,
        "endLevel": 9,
        "floorLevel": 7,
        "openings": [
          {
            "id": "admin-west-front-office-cross-l7-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-corridor-l7",
        "a": [
          -22,
          54
        ],
        "b": [
          -22,
          80
        ],
        "startLevel": 7,
        "endLevel": 9,
        "floorLevel": 7,
        "openings": [
          {
            "id": "admin-west-rear-corridor-l7-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-west-rear-corridor-l7-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-office-cross-l7",
        "a": [
          -40,
          67
        ],
        "b": [
          -22,
          67
        ],
        "startLevel": 7,
        "endLevel": 9,
        "floorLevel": 7,
        "openings": [
          {
            "id": "admin-west-rear-office-cross-l7-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-corridor-l7",
        "a": [
          22,
          0
        ],
        "b": [
          22,
          26
        ],
        "startLevel": 7,
        "endLevel": 9,
        "floorLevel": 7,
        "openings": [
          {
            "id": "admin-east-front-corridor-l7-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-east-front-corridor-l7-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-office-cross-l7",
        "a": [
          22,
          13
        ],
        "b": [
          40,
          13
        ],
        "startLevel": 7,
        "endLevel": 9,
        "floorLevel": 7,
        "openings": [
          {
            "id": "admin-east-front-office-cross-l7-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-corridor-l7",
        "a": [
          22,
          54
        ],
        "b": [
          22,
          80
        ],
        "startLevel": 7,
        "endLevel": 9,
        "floorLevel": 7,
        "openings": [
          {
            "id": "admin-east-rear-corridor-l7-opening-0",
            "x": -7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          },
          {
            "id": "admin-east-rear-corridor-l7-opening-1",
            "x": 7,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "ochre",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-office-cross-l7",
        "a": [
          22,
          67
        ],
        "b": [
          40,
          67
        ],
        "startLevel": 7,
        "endLevel": 9,
        "floorLevel": 7,
        "openings": [
          {
            "id": "admin-east-rear-office-cross-l7-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "cream",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      }
    ],
    "props": [
      {
        "id": "admin-waiting-2.4",
        "assetId": "waiting-bench",
        "x": -36,
        "z": 2.4,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "admin-west-public",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-waiting-9.1",
        "assetId": "waiting-bench",
        "x": -36,
        "z": 9.1,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-public",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-waiting-clock",
        "assetId": "wall-clock",
        "x": -39.7,
        "z": 6,
        "level": 1,
        "yOffset": 2.5,
        "yaw": -1.570796,
        "roomId": "admin-west-public",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-post-counter--25",
        "assetId": "service-counter",
        "x": -25,
        "z": 4.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-post",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-post-counter--23",
        "assetId": "service-counter",
        "x": -23,
        "z": 4.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-post",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-post-counter--21",
        "assetId": "service-counter",
        "x": -21,
        "z": 4.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-post",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-post-sorting--23",
        "assetId": "pigeonhole-cabinet",
        "x": -23,
        "z": 10.8,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-post",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-post-sorting--20",
        "assetId": "pigeonhole-cabinet",
        "x": -20,
        "z": 10.8,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-post",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-post-desk",
        "assetId": "writing-desk",
        "x": -17.5,
        "z": 7.3,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-post",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-post-chair",
        "assetId": "clerk-chair",
        "x": -17.5,
        "z": 8.5,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-post",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-exchange-desk--36",
        "assetId": "writing-desk",
        "x": -36,
        "z": 17,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-exchange",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-exchange-chair--36",
        "assetId": "clerk-chair",
        "x": -36,
        "z": 18.15,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-exchange",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-exchange-desk--31.8",
        "assetId": "writing-desk",
        "x": -31.8,
        "z": 23.5,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-exchange",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-exchange-chair--31.8",
        "assetId": "clerk-chair",
        "x": -31.8,
        "z": 24.65,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-exchange",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-vault-safe",
        "assetId": "document-safe",
        "x": -24.3,
        "z": 24,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-vault",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-exchange-ledgers",
        "assetId": "ledger-bookcase",
        "x": -38.3,
        "z": 24.8,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-exchange",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-ante-bench",
        "assetId": "waiting-bench",
        "x": -23,
        "z": 15,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "admin-west-foyer",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-foreign-desk",
        "assetId": "writing-desk",
        "x": 16.9,
        "z": 3.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-foreign",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-foreign-chair",
        "assetId": "clerk-chair",
        "x": 16.9,
        "z": 4.45,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-foreign",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-information-counter-23",
        "assetId": "service-counter",
        "x": 23,
        "z": 3.5,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-information",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ],
        "labelText": "INFO"
      },
      {
        "id": "admin-information-counter-25",
        "assetId": "service-counter",
        "x": 25,
        "z": 3.5,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-information",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ],
        "labelText": "INFO"
      },
      {
        "id": "admin-ambulance-cot-31",
        "assetId": "iron-cot",
        "x": 31,
        "z": 5,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "admin-east-ambulance",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-ambulance-cot-37",
        "assetId": "iron-cot",
        "x": 37,
        "z": 5,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "admin-east-ambulance",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-ambulance-basin",
        "assetId": "washstand",
        "x": 38.5,
        "z": 9.8,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-ambulance",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-doctor-desk",
        "assetId": "writing-desk",
        "x": 30.5,
        "z": 15.1,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-doctor",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-doctor-chair",
        "assetId": "clerk-chair",
        "x": 30.5,
        "z": 16.4,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-doctor",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-doctor-basin",
        "assetId": "washstand",
        "x": 31.3,
        "z": 24.4,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-doctor",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-pharmacy-15.6",
        "assetId": "pharmacy-cabinet",
        "x": 39.45,
        "z": 15.6,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "admin-east-pharmacy",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-pharmacy-22.8",
        "assetId": "pharmacy-cabinet",
        "x": 39.45,
        "z": 22.8,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "admin-east-pharmacy",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-pharmacy-desk",
        "assetId": "writing-desk",
        "x": 36.5,
        "z": 25,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-pharmacy",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l1-room-0-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 58,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l1-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l1-room-0-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 59.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l1-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l1-room-0-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 65.9,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l1-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l1-room-0-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 60.5,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-rear-l1-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l1-room-1-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 71,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l1-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l1-room-1-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 72.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l1-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l1-room-1-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 78.9,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l1-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l1-room-1-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 73.5,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-rear-l1-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l1-room-0-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 58,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l1-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l1-room-0-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 59.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l1-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l1-room-0-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 65.9,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l1-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l1-room-0-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 60.5,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-rear-l1-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l1-room-1-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 71,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l1-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l1-room-1-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 72.2,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l1-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l1-room-1-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 78.9,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l1-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l1-room-1-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 73.5,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-rear-l1-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l3-room-0-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 4,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l3-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l3-room-0-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 5.2,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l3-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l3-room-0-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 11.9,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l3-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l3-room-0-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 6.5,
        "level": 3,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-front-l3-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l3-room-1-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 17,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l3-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l3-room-1-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 18.2,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l3-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l3-room-1-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 24.9,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l3-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l3-room-1-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 19.5,
        "level": 3,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-front-l3-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l3-room-0-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 58,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l3-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l3-room-0-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 59.2,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l3-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l3-room-0-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 65.9,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l3-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l3-room-0-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 60.5,
        "level": 3,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-rear-l3-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l3-room-1-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 71,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l3-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l3-room-1-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 72.2,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l3-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l3-room-1-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 78.9,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l3-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l3-room-1-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 73.5,
        "level": 3,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-rear-l3-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l3-room-0-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 4,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l3-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l3-room-0-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 5.2,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l3-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l3-room-0-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 11.9,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l3-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l3-room-0-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 6.5,
        "level": 3,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-front-l3-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l3-room-1-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 17,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l3-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l3-room-1-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 18.2,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l3-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l3-room-1-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 24.9,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l3-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l3-room-1-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 19.5,
        "level": 3,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-front-l3-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l3-room-0-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 58,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l3-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l3-room-0-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 59.2,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l3-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l3-room-0-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 65.9,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l3-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l3-room-0-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 60.5,
        "level": 3,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-rear-l3-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l3-room-1-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 71,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l3-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l3-room-1-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 72.2,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l3-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l3-room-1-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 78.9,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l3-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l3-room-1-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 73.5,
        "level": 3,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-rear-l3-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l5-room-0-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 4,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l5-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l5-room-0-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 5.2,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l5-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l5-room-0-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 11.9,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l5-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l5-room-0-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 6.5,
        "level": 5,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-front-l5-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l5-room-1-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 17,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l5-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l5-room-1-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 18.2,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l5-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l5-room-1-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 24.9,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l5-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l5-room-1-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 19.5,
        "level": 5,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-front-l5-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l5-room-0-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 58,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l5-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l5-room-0-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 59.2,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l5-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l5-room-0-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 65.9,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l5-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l5-room-0-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 60.5,
        "level": 5,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-rear-l5-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l5-room-1-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 71,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l5-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l5-room-1-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 72.2,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l5-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l5-room-1-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 78.9,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l5-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l5-room-1-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 73.5,
        "level": 5,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-rear-l5-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l5-room-0-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 4,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l5-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l5-room-0-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 5.2,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l5-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l5-room-0-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 11.9,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l5-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l5-room-0-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 6.5,
        "level": 5,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-front-l5-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l5-room-1-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 17,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l5-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l5-room-1-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 18.2,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l5-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l5-room-1-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 24.9,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l5-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l5-room-1-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 19.5,
        "level": 5,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-front-l5-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l5-room-0-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 58,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l5-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l5-room-0-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 59.2,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l5-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l5-room-0-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 65.9,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l5-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l5-room-0-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 60.5,
        "level": 5,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-rear-l5-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l5-room-1-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 71,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l5-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l5-room-1-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 72.2,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l5-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l5-room-1-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 78.9,
        "level": 5,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l5-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l5-room-1-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 73.5,
        "level": 5,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-rear-l5-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l7-room-0-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 4,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l7-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l7-room-0-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 5.2,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l7-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l7-room-0-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 11.9,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l7-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l7-room-0-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 6.5,
        "level": 7,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-front-l7-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l7-room-1-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 17,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l7-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l7-room-1-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 18.2,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l7-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-front-l7-room-1-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 24.9,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-front-l7-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-front-l7-room-1-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 19.5,
        "level": 7,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-front-l7-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l7-room-0-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 58,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l7-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l7-room-0-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 59.2,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l7-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l7-room-0-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 65.9,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l7-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l7-room-0-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 60.5,
        "level": 7,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-rear-l7-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l7-room-1-desk",
        "assetId": "writing-desk",
        "x": -31,
        "z": 71,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l7-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l7-room-1-chair",
        "assetId": "clerk-chair",
        "x": -31,
        "z": 72.2,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l7-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-west-rear-l7-room-1-books",
        "assetId": "ledger-bookcase",
        "x": -36,
        "z": 78.9,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-west-rear-l7-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-west-rear-l7-room-1-lamp",
        "assetId": "opal-pendant",
        "x": -31,
        "z": 73.5,
        "level": 7,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-west-rear-l7-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l7-room-0-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 4,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l7-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l7-room-0-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 5.2,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l7-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l7-room-0-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 11.9,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l7-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l7-room-0-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 6.5,
        "level": 7,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-front-l7-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l7-room-1-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 17,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l7-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l7-room-1-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 18.2,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l7-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-front-l7-room-1-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 24.9,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-front-l7-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-front-l7-room-1-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 19.5,
        "level": 7,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-front-l7-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l7-room-0-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 58,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l7-room-0",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l7-room-0-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 59.2,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l7-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l7-room-0-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 65.9,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l7-room-0",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l7-room-0-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 60.5,
        "level": 7,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-rear-l7-room-0",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l7-room-1-desk",
        "assetId": "writing-desk",
        "x": 31,
        "z": 71,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l7-room-1",
        "sourceIds": [
          "INT-NY-PLAN",
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l7-room-1-chair",
        "assetId": "clerk-chair",
        "x": 31,
        "z": 72.2,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l7-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT"
        ]
      },
      {
        "id": "admin-east-rear-l7-room-1-books",
        "assetId": "ledger-bookcase",
        "x": 36,
        "z": 78.9,
        "level": 7,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "admin-east-rear-l7-room-1",
        "sourceIds": [
          "INT-ADMIN-HUNT",
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-east-rear-l7-room-1-lamp",
        "assetId": "opal-pendant",
        "x": 31,
        "z": 73.5,
        "level": 7,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": "admin-east-rear-l7-room-1",
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-front-pendant--36-6",
        "assetId": "opal-pendant",
        "x": -36,
        "z": 6,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-front-pendant--36-18",
        "assetId": "opal-pendant",
        "x": -36,
        "z": 18,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-front-pendant--24-6",
        "assetId": "opal-pendant",
        "x": -24,
        "z": 6,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-front-pendant--24-18",
        "assetId": "opal-pendant",
        "x": -24,
        "z": 18,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-front-pendant-24-6",
        "assetId": "opal-pendant",
        "x": 24,
        "z": 6,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-front-pendant-24-18",
        "assetId": "opal-pendant",
        "x": 24,
        "z": 18,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-front-pendant-36-6",
        "assetId": "opal-pendant",
        "x": 36,
        "z": 6,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      },
      {
        "id": "admin-front-pendant-36-18",
        "assetId": "opal-pendant",
        "x": 36,
        "z": 18,
        "level": 1,
        "yOffset": 3.08,
        "yaw": 0,
        "roomId": null,
        "sourceIds": [
          "INT-NY-REPORT"
        ]
      }
    ],
    "portals": [
      {
        "id": "admin-west-rear-corridor-l1-opening-0",
        "runId": "admin-west-rear-corridor-l1",
        "level": 1,
        "position": [
          -22,
          2.12,
          60
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-corridor-l1-opening-1",
        "runId": "admin-west-rear-corridor-l1",
        "level": 1,
        "position": [
          -22,
          2.12,
          74
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-office-cross-l1-opening-0",
        "runId": "admin-west-rear-office-cross-l1",
        "level": 1,
        "position": [
          -31,
          2.12,
          67
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-corridor-l1-opening-0",
        "runId": "admin-east-rear-corridor-l1",
        "level": 1,
        "position": [
          22,
          2.12,
          60
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-corridor-l1-opening-1",
        "runId": "admin-east-rear-corridor-l1",
        "level": 1,
        "position": [
          22,
          2.12,
          74
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-office-cross-l1-opening-0",
        "runId": "admin-east-rear-office-cross-l1",
        "level": 1,
        "position": [
          31,
          2.12,
          67
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-front-corridor-l3-opening-0",
        "runId": "admin-west-front-corridor-l3",
        "level": 3,
        "position": [
          -22,
          6.36,
          6
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-front-corridor-l3-opening-1",
        "runId": "admin-west-front-corridor-l3",
        "level": 3,
        "position": [
          -22,
          6.36,
          20
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-front-office-cross-l3-opening-0",
        "runId": "admin-west-front-office-cross-l3",
        "level": 3,
        "position": [
          -31,
          6.36,
          13
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-corridor-l3-opening-0",
        "runId": "admin-west-rear-corridor-l3",
        "level": 3,
        "position": [
          -22,
          6.36,
          60
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-corridor-l3-opening-1",
        "runId": "admin-west-rear-corridor-l3",
        "level": 3,
        "position": [
          -22,
          6.36,
          74
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-office-cross-l3-opening-0",
        "runId": "admin-west-rear-office-cross-l3",
        "level": 3,
        "position": [
          -31,
          6.36,
          67
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-front-corridor-l3-opening-0",
        "runId": "admin-east-front-corridor-l3",
        "level": 3,
        "position": [
          22,
          6.36,
          6
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-front-corridor-l3-opening-1",
        "runId": "admin-east-front-corridor-l3",
        "level": 3,
        "position": [
          22,
          6.36,
          20
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-front-office-cross-l3-opening-0",
        "runId": "admin-east-front-office-cross-l3",
        "level": 3,
        "position": [
          31,
          6.36,
          13
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-corridor-l3-opening-0",
        "runId": "admin-east-rear-corridor-l3",
        "level": 3,
        "position": [
          22,
          6.36,
          60
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-corridor-l3-opening-1",
        "runId": "admin-east-rear-corridor-l3",
        "level": 3,
        "position": [
          22,
          6.36,
          74
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-office-cross-l3-opening-0",
        "runId": "admin-east-rear-office-cross-l3",
        "level": 3,
        "position": [
          31,
          6.36,
          67
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-front-corridor-l5-opening-0",
        "runId": "admin-west-front-corridor-l5",
        "level": 5,
        "position": [
          -22,
          10.6,
          6
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-front-corridor-l5-opening-1",
        "runId": "admin-west-front-corridor-l5",
        "level": 5,
        "position": [
          -22,
          10.6,
          20
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-front-office-cross-l5-opening-0",
        "runId": "admin-west-front-office-cross-l5",
        "level": 5,
        "position": [
          -31,
          10.6,
          13
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-corridor-l5-opening-0",
        "runId": "admin-west-rear-corridor-l5",
        "level": 5,
        "position": [
          -22,
          10.6,
          60
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-corridor-l5-opening-1",
        "runId": "admin-west-rear-corridor-l5",
        "level": 5,
        "position": [
          -22,
          10.6,
          74
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-office-cross-l5-opening-0",
        "runId": "admin-west-rear-office-cross-l5",
        "level": 5,
        "position": [
          -31,
          10.6,
          67
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-front-corridor-l5-opening-0",
        "runId": "admin-east-front-corridor-l5",
        "level": 5,
        "position": [
          22,
          10.6,
          6
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-front-corridor-l5-opening-1",
        "runId": "admin-east-front-corridor-l5",
        "level": 5,
        "position": [
          22,
          10.6,
          20
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-front-office-cross-l5-opening-0",
        "runId": "admin-east-front-office-cross-l5",
        "level": 5,
        "position": [
          31,
          10.6,
          13
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-corridor-l5-opening-0",
        "runId": "admin-east-rear-corridor-l5",
        "level": 5,
        "position": [
          22,
          10.6,
          60
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-corridor-l5-opening-1",
        "runId": "admin-east-rear-corridor-l5",
        "level": 5,
        "position": [
          22,
          10.6,
          74
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-office-cross-l5-opening-0",
        "runId": "admin-east-rear-office-cross-l5",
        "level": 5,
        "position": [
          31,
          10.6,
          67
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-front-corridor-l7-opening-0",
        "runId": "admin-west-front-corridor-l7",
        "level": 7,
        "position": [
          -22,
          14.84,
          6
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-front-corridor-l7-opening-1",
        "runId": "admin-west-front-corridor-l7",
        "level": 7,
        "position": [
          -22,
          14.84,
          20
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-front-office-cross-l7-opening-0",
        "runId": "admin-west-front-office-cross-l7",
        "level": 7,
        "position": [
          -31,
          14.84,
          13
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-corridor-l7-opening-0",
        "runId": "admin-west-rear-corridor-l7",
        "level": 7,
        "position": [
          -22,
          14.84,
          60
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-corridor-l7-opening-1",
        "runId": "admin-west-rear-corridor-l7",
        "level": 7,
        "position": [
          -22,
          14.84,
          74
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-west-rear-office-cross-l7-opening-0",
        "runId": "admin-west-rear-office-cross-l7",
        "level": 7,
        "position": [
          -31,
          14.84,
          67
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-front-corridor-l7-opening-0",
        "runId": "admin-east-front-corridor-l7",
        "level": 7,
        "position": [
          22,
          14.84,
          6
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-front-corridor-l7-opening-1",
        "runId": "admin-east-front-corridor-l7",
        "level": 7,
        "position": [
          22,
          14.84,
          20
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-front-office-cross-l7-opening-0",
        "runId": "admin-east-front-office-cross-l7",
        "level": 7,
        "position": [
          31,
          14.84,
          13
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-corridor-l7-opening-0",
        "runId": "admin-east-rear-corridor-l7",
        "level": 7,
        "position": [
          22,
          14.84,
          60
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-corridor-l7-opening-1",
        "runId": "admin-east-rear-corridor-l7",
        "level": 7,
        "position": [
          22,
          14.84,
          74
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "admin-east-rear-office-cross-l7-opening-0",
        "runId": "admin-east-rear-office-cross-l7",
        "level": 7,
        "position": [
          31,
          14.84,
          67
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      }
    ],
    "reservedRoutes": [
      {
        "id": "admin-west-rear-l1-spine",
        "level": 1,
        "points": [
          [
            -18,
            57
          ],
          [
            -18,
            76
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-east-rear-l1-spine",
        "level": 1,
        "points": [
          [
            18,
            57
          ],
          [
            18,
            76
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-west-front-l3-spine",
        "level": 3,
        "points": [
          [
            -18,
            3
          ],
          [
            -18,
            22
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-west-rear-l3-spine",
        "level": 3,
        "points": [
          [
            -18,
            57
          ],
          [
            -18,
            76
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-east-front-l3-spine",
        "level": 3,
        "points": [
          [
            18,
            3
          ],
          [
            18,
            22
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-east-rear-l3-spine",
        "level": 3,
        "points": [
          [
            18,
            57
          ],
          [
            18,
            76
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-west-front-l5-spine",
        "level": 5,
        "points": [
          [
            -18,
            3
          ],
          [
            -18,
            22
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-west-rear-l5-spine",
        "level": 5,
        "points": [
          [
            -18,
            57
          ],
          [
            -18,
            76
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-east-front-l5-spine",
        "level": 5,
        "points": [
          [
            18,
            3
          ],
          [
            18,
            22
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-east-rear-l5-spine",
        "level": 5,
        "points": [
          [
            18,
            57
          ],
          [
            18,
            76
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-west-front-l7-spine",
        "level": 7,
        "points": [
          [
            -18,
            3
          ],
          [
            -18,
            22
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-west-rear-l7-spine",
        "level": 7,
        "points": [
          [
            -18,
            57
          ],
          [
            -18,
            76
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-east-front-l7-spine",
        "level": 7,
        "points": [
          [
            18,
            3
          ],
          [
            18,
            22
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-east-rear-l7-spine",
        "level": 7,
        "points": [
          [
            18,
            57
          ],
          [
            18,
            76
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-stair-keepout--1-1",
        "level": 1,
        "points": [
          [
            -15,
            22
          ],
          [
            -15,
            25
          ],
          [
            -15,
            28
          ]
        ],
        "width": 6.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-stair-keepout-1-1",
        "level": 1,
        "points": [
          [
            15,
            22
          ],
          [
            15,
            25
          ],
          [
            15,
            28
          ]
        ],
        "width": 6.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-stair-keepout--1-3",
        "level": 3,
        "points": [
          [
            -15,
            22
          ],
          [
            -15,
            25
          ],
          [
            -15,
            28
          ]
        ],
        "width": 6.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-stair-keepout-1-3",
        "level": 3,
        "points": [
          [
            15,
            22
          ],
          [
            15,
            25
          ],
          [
            15,
            28
          ]
        ],
        "width": 6.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-stair-keepout--1-5",
        "level": 5,
        "points": [
          [
            -15,
            22
          ],
          [
            -15,
            25
          ],
          [
            -15,
            28
          ]
        ],
        "width": 6.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-stair-keepout-1-5",
        "level": 5,
        "points": [
          [
            15,
            22
          ],
          [
            15,
            25
          ],
          [
            15,
            28
          ]
        ],
        "width": 6.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-stair-keepout--1-7",
        "level": 7,
        "points": [
          [
            -15,
            22
          ],
          [
            -15,
            25
          ],
          [
            -15,
            28
          ]
        ],
        "width": 6.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "admin-stair-keepout-1-7",
        "level": 7,
        "points": [
          [
            15,
            22
          ],
          [
            15,
            25
          ],
          [
            15,
            28
          ]
        ],
        "width": 6.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      }
    ],
    "replacements": {
      "hiddenSourceParts": []
    },
    "notes": [
      "The Hunt ground-floor front-half room layout is retained, including the access kit permanent office passages. No duplicate front structural walls are added.",
      "Rear and upper office layouts are deliberately identified interpretations. Desks, mail cabinets, cots and pharmacy jars are period-appropriate models chosen from the documented room uses, not claims to have copied an inspected Administration office photograph.",
      "The archival Arnold dome photograph informed repeated classical panel language only. Its photographic date is n.d. and its publication rights require archive contact; no image pixels are redistributed.",
      "Widened stair wells occupy some source-labeled service/toilet areas; those areas are kept free rather than placing fixtures inside an access route.",
      "Source-local +X right, +Z rear, +Y up; structural floors stay on 2.12 m native levels. Furniture dimensions are metres and are not stretched to grid sizes.",
      "Physical collision/fuel/material assignments and game integration remain consumer-owned. Room labels and route keepouts are descriptive evidence, not proof of runtime traversal."
    ],
    "prototypeIds": [
      "waiting-bench",
      "wall-clock",
      "service-counter",
      "pigeonhole-cabinet",
      "writing-desk",
      "clerk-chair",
      "document-safe",
      "ledger-bookcase",
      "iron-cot",
      "washstand",
      "pharmacy-cabinet",
      "opal-pendant"
    ]
  },
  "horticulture": {
    "id": "landmark-interior-horticulture-v1",
    "version": 1,
    "venueId": "horticulture",
    "units": "metres",
    "occupiedLevels": [
      1,
      3
    ],
    "sourcePins": {
      "building": {
        "commit": "c4287338ff93907900a94a86b6c7e3bed0ae7c2f",
        "path": "assets/art/exposition-horticulture/index.js"
      },
      "access": {
        "commit": "26e1b1301ce577ab8ed26afa32fdafa93d7d44e4",
        "path": "assets/art/exploration-access/plans.js"
      }
    },
    "rooms": [
      {
        "id": "hort-palm-hall",
        "label": "Palm hall and Crystal Cave mound",
        "level": 1,
        "polygon": [
          [
            28,
            36
          ],
          [
            27.045923,
            43.246933
          ],
          [
            24.248711,
            50
          ],
          [
            19.79899,
            55.79899
          ],
          [
            14,
            60.248711
          ],
          [
            7.246933,
            63.045923
          ],
          [
            0,
            64
          ],
          [
            -7.246933,
            63.045923
          ],
          [
            -14,
            60.248711
          ],
          [
            -19.79899,
            55.79899
          ],
          [
            -24.248711,
            50
          ],
          [
            -27.045923,
            43.246933
          ],
          [
            -28,
            36
          ],
          [
            -27.045923,
            28.753067
          ],
          [
            -24.248711,
            22
          ],
          [
            -19.79899,
            16.20101
          ],
          [
            -14,
            11.751289
          ],
          [
            -7.246933,
            8.954077
          ],
          [
            0,
            8
          ],
          [
            7.246933,
            8.954077
          ],
          [
            14,
            11.751289
          ],
          [
            19.79899,
            16.20101
          ],
          [
            24.248711,
            22
          ],
          [
            27.045923,
            28.753067
          ]
        ],
        "sourceStatus": "Great planted mound and cave shown in contemporary photograph. Placement and hollow shell simplified.",
        "sourceIds": [
          "INT-HORT-GROTTO"
        ]
      },
      {
        "id": "hort-west-fruit",
        "label": "Fruit and botanical displays",
        "level": 1,
        "polygon": [
          [
            -117,
            24
          ],
          [
            -33,
            24
          ],
          [
            -33,
            44
          ],
          [
            -117,
            44
          ]
        ],
        "sourceStatus": "Photo-derived display types; exact exhibitor allocations and positions are not asserted.",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-west-cafe",
        "label": "Pavilion gallery cafe",
        "level": 3,
        "polygon": [
          [
            -153,
            12
          ],
          [
            -117,
            12
          ],
          [
            -117,
            38
          ],
          [
            -153,
            38
          ]
        ],
        "sourceStatus": "Gallery cafe use documented; furniture layout interpreted.",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-west-potting",
        "label": "Potting and exhibit service bay",
        "level": 1,
        "polygon": [
          [
            -153,
            76
          ],
          [
            -143,
            76
          ],
          [
            -143,
            88
          ],
          [
            -153,
            88
          ]
        ],
        "sourceStatus": "Authored service room, not an asserted as-built subdivision.",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-east-fruit",
        "label": "Fruit and botanical displays",
        "level": 1,
        "polygon": [
          [
            33,
            24
          ],
          [
            117,
            24
          ],
          [
            117,
            44
          ],
          [
            33,
            44
          ]
        ],
        "sourceStatus": "Photo-derived display types; exact exhibitor allocations and positions are not asserted.",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-east-cafe",
        "label": "Pavilion gallery cafe",
        "level": 3,
        "polygon": [
          [
            117,
            12
          ],
          [
            153,
            12
          ],
          [
            153,
            38
          ],
          [
            117,
            38
          ]
        ],
        "sourceStatus": "Gallery cafe use documented; furniture layout interpreted.",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-east-potting",
        "label": "Potting and exhibit service bay",
        "level": 1,
        "polygon": [
          [
            143,
            76
          ],
          [
            153,
            76
          ],
          [
            153,
            88
          ],
          [
            143,
            88
          ]
        ],
        "sourceStatus": "Authored service room, not an asserted as-built subdivision.",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      }
    ],
    "walls": [
      {
        "id": "hort-stall--1-61",
        "a": [
          -61,
          24
        ],
        "b": [
          -61,
          30
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Interpretive installation partition",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-stall--1-89",
        "a": [
          -89,
          24
        ],
        "b": [
          -89,
          30
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Interpretive installation partition",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-service-west-side",
        "a": [
          -143,
          76
        ],
        "b": [
          -143,
          88
        ],
        "startLevel": 1,
        "endLevel": 3,
        "floorLevel": 1,
        "openings": [
          {
            "id": "hort-service-west-side-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "oak",
        "sourceStatus": "Service subdivision interpreted, exact historic plan unknown.",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-service-west-front",
        "a": [
          -153,
          76
        ],
        "b": [
          -143,
          76
        ],
        "startLevel": 1,
        "endLevel": 3,
        "floorLevel": 1,
        "openings": [
          {
            "id": "hort-service-west-front-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "oak",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-stall-1-61",
        "a": [
          61,
          24
        ],
        "b": [
          61,
          30
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Interpretive installation partition",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-stall-1-89",
        "a": [
          89,
          24
        ],
        "b": [
          89,
          30
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Interpretive installation partition",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-service-east-side",
        "a": [
          143,
          76
        ],
        "b": [
          143,
          88
        ],
        "startLevel": 1,
        "endLevel": 3,
        "floorLevel": 1,
        "openings": [
          {
            "id": "hort-service-east-side-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "oak",
        "sourceStatus": "Service subdivision interpreted, exact historic plan unknown.",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-service-east-front",
        "a": [
          143,
          76
        ],
        "b": [
          153,
          76
        ],
        "startLevel": 1,
        "endLevel": 3,
        "floorLevel": 1,
        "openings": [
          {
            "id": "hort-service-east-front-opening-0",
            "x": 0,
            "width": 2,
            "height": 2.8,
            "bottom": 0
          }
        ],
        "finish": "oak",
        "sourceStatus": "inferred",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      }
    ],
    "props": [
      {
        "id": "hort-crystal-cave",
        "assetId": "rock-grotto",
        "x": 0,
        "z": 36,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-palm-hall",
        "sourceIds": [
          "INT-HORT-GROTTO"
        ]
      },
      {
        "id": "hort-fruit--1-43-28",
        "assetId": "fruit-stand",
        "x": -43,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-43-40",
        "assetId": "fruit-stand",
        "x": -43,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-55-28",
        "assetId": "fruit-stand",
        "x": -55,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-55-40",
        "assetId": "fruit-stand",
        "x": -55,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-67-28",
        "assetId": "fruit-stand",
        "x": -67,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-67-40",
        "assetId": "fruit-stand",
        "x": -67,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-83-28",
        "assetId": "fruit-stand",
        "x": -83,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-83-40",
        "assetId": "fruit-stand",
        "x": -83,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-95-28",
        "assetId": "fruit-stand",
        "x": -95,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-95-40",
        "assetId": "fruit-stand",
        "x": -95,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-107-28",
        "assetId": "fruit-stand",
        "x": -107,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit--1-107-40",
        "assetId": "fruit-stand",
        "x": -107,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-wardian--1-47",
        "assetId": "wardian-case",
        "x": -47,
        "z": 34,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-wardian--1-103",
        "assetId": "wardian-case",
        "x": -103,
        "z": 34,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-cafe--1-129-22",
        "assetId": "cafe-table-set",
        "x": -129,
        "z": 22,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-cafe",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-cafe--1-129-30",
        "assetId": "cafe-table-set",
        "x": -129,
        "z": 30,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-cafe",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-cafe--1-141-22",
        "assetId": "cafe-table-set",
        "x": -141,
        "z": 22,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-cafe",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-cafe--1-141-30",
        "assetId": "cafe-table-set",
        "x": -141,
        "z": 30,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-west-cafe",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-potting--1-79.5",
        "assetId": "potting-bench",
        "x": -148,
        "z": 79.5,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.570796,
        "roomId": null,
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-potting--1-84",
        "assetId": "potting-bench",
        "x": -148,
        "z": 84,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.570796,
        "roomId": null,
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-fruit-1-43-28",
        "assetId": "fruit-stand",
        "x": 43,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-43-40",
        "assetId": "fruit-stand",
        "x": 43,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-55-28",
        "assetId": "fruit-stand",
        "x": 55,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-55-40",
        "assetId": "fruit-stand",
        "x": 55,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-67-28",
        "assetId": "fruit-stand",
        "x": 67,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-67-40",
        "assetId": "fruit-stand",
        "x": 67,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-83-28",
        "assetId": "fruit-stand",
        "x": 83,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-83-40",
        "assetId": "fruit-stand",
        "x": 83,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-95-28",
        "assetId": "fruit-stand",
        "x": 95,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-95-40",
        "assetId": "fruit-stand",
        "x": 95,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-107-28",
        "assetId": "fruit-stand",
        "x": 107,
        "z": 28,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-fruit-1-107-40",
        "assetId": "fruit-stand",
        "x": 107,
        "z": 40,
        "level": 1,
        "yOffset": 0,
        "yaw": 3.141593,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-wardian-1-47",
        "assetId": "wardian-case",
        "x": 47,
        "z": 34,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-wardian-1-103",
        "assetId": "wardian-case",
        "x": 103,
        "z": 34,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      },
      {
        "id": "hort-cafe-1-129-22",
        "assetId": "cafe-table-set",
        "x": 129,
        "z": 22,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-cafe",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-cafe-1-129-30",
        "assetId": "cafe-table-set",
        "x": 129,
        "z": 30,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-cafe",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-cafe-1-141-22",
        "assetId": "cafe-table-set",
        "x": 141,
        "z": 22,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-cafe",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-cafe-1-141-30",
        "assetId": "cafe-table-set",
        "x": 141,
        "z": 30,
        "level": 3,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-cafe",
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-potting-1-79.5",
        "assetId": "potting-bench",
        "x": 148,
        "z": 79.5,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": null,
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-potting-1-84",
        "assetId": "potting-bench",
        "x": 148,
        "z": 84,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": null,
        "sourceIds": [
          "INT-HORT-CONKEY"
        ]
      },
      {
        "id": "hort-california-orange-tower",
        "assetId": "orange-tower",
        "x": 75,
        "z": 30,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "hort-east-fruit",
        "sourceIds": [
          "INT-HORT-FRUIT"
        ]
      }
    ],
    "portals": [
      {
        "id": "hort-service-west-side-opening-0",
        "runId": "hort-service-west-side",
        "level": 1,
        "position": [
          -143,
          2.12,
          82
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "Service subdivision interpreted, exact historic plan unknown."
      },
      {
        "id": "hort-service-west-front-opening-0",
        "runId": "hort-service-west-front",
        "level": 1,
        "position": [
          -148,
          2.12,
          76
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      },
      {
        "id": "hort-service-east-side-opening-0",
        "runId": "hort-service-east-side",
        "level": 1,
        "position": [
          143,
          2.12,
          82
        ],
        "heading": -1.570796,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "Service subdivision interpreted, exact historic plan unknown."
      },
      {
        "id": "hort-service-east-front-opening-0",
        "runId": "hort-service-east-front",
        "level": 1,
        "position": [
          148,
          2.12,
          76
        ],
        "heading": 0,
        "clearWidth": 2,
        "clearHeight": 2.8,
        "stateful": false,
        "sourceStatus": "inferred"
      }
    ],
    "reservedRoutes": [
      {
        "id": "hort-west-long-gallery",
        "level": 1,
        "points": [
          [
            -34,
            36
          ],
          [
            -115,
            36
          ]
        ],
        "width": 2.5,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "hort-west-court-approach",
        "level": 1,
        "points": [
          [
            -75,
            36
          ],
          [
            -75,
            44
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "hort-west-gallery-stair",
        "level": 1,
        "points": [
          [
            -135,
            35
          ],
          [
            -135,
            46
          ]
        ],
        "width": 3.2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "hort-east-long-gallery",
        "level": 1,
        "points": [
          [
            34,
            36
          ],
          [
            115,
            36
          ]
        ],
        "width": 2.5,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "hort-east-court-approach",
        "level": 1,
        "points": [
          [
            75,
            36
          ],
          [
            75,
            44
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "hort-east-gallery-stair",
        "level": 1,
        "points": [
          [
            135,
            35
          ],
          [
            135,
            46
          ]
        ],
        "width": 3.2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "hort-main-entrance",
        "level": 1,
        "points": [
          [
            0,
            0
          ],
          [
            0,
            26
          ],
          [
            0,
            36
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "hort-grotto-loop--1",
        "level": 1,
        "points": [
          [
            0,
            24
          ],
          [
            -7.5,
            26
          ],
          [
            -7.5,
            46
          ],
          [
            0,
            49
          ]
        ],
        "width": 1.6,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "hort-grotto-loop-1",
        "level": 1,
        "points": [
          [
            0,
            24
          ],
          [
            7.5,
            26
          ],
          [
            7.5,
            46
          ],
          [
            0,
            49
          ]
        ],
        "width": 1.6,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "hort-rotunda-stair",
        "level": 1,
        "points": [
          [
            0,
            49
          ],
          [
            0,
            59.546838
          ]
        ],
        "width": 3.2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      }
    ],
    "replacements": {
      "hiddenSourceParts": [
        "palm-4/trunk",
        "palm-4/frond-0",
        "palm-4/frond-1",
        "palm-4/frond-2",
        "palm-4/frond-3",
        "palm-4/frond-4",
        "palm-4/frond-5",
        "palm-4/frond-6",
        "palm-4/frond-7",
        "palm-4/frond-8",
        "palm-4/frond-9",
        "palm-4/frond-10",
        "palm-4/frond-11",
        "palm-5/trunk",
        "palm-5/frond-0",
        "palm-5/frond-1",
        "palm-5/frond-2",
        "palm-5/frond-3",
        "palm-5/frond-4",
        "palm-5/frond-5",
        "palm-5/frond-6",
        "palm-5/frond-7",
        "palm-5/frond-8",
        "palm-5/frond-9",
        "palm-5/frond-10",
        "palm-5/frond-11",
        "cafe/-129/22/top",
        "cafe/-129/22/leg",
        "cafe/-129/22/bench--1.1",
        "cafe/-129/22/foot--1.1--0.15",
        "cafe/-129/22/foot--1.1-0.15",
        "cafe/-129/22/bench-1.1",
        "cafe/-129/22/foot-1.1--0.15",
        "cafe/-129/22/foot-1.1-0.15",
        "cafe/-129/30/top",
        "cafe/-129/30/leg",
        "cafe/-129/30/bench--1.1",
        "cafe/-129/30/foot--1.1--0.15",
        "cafe/-129/30/foot--1.1-0.15",
        "cafe/-129/30/bench-1.1",
        "cafe/-129/30/foot-1.1--0.15",
        "cafe/-129/30/foot-1.1-0.15",
        "cafe/-141/22/top",
        "cafe/-141/22/leg",
        "cafe/-141/22/bench--1.1",
        "cafe/-141/22/foot--1.1--0.15",
        "cafe/-141/22/foot--1.1-0.15",
        "cafe/-141/22/bench-1.1",
        "cafe/-141/22/foot-1.1--0.15",
        "cafe/-141/22/foot-1.1-0.15",
        "cafe/-141/30/top",
        "cafe/-141/30/leg",
        "cafe/-141/30/bench--1.1",
        "cafe/-141/30/foot--1.1--0.15",
        "cafe/-141/30/foot--1.1-0.15",
        "cafe/-141/30/bench-1.1",
        "cafe/-141/30/foot-1.1--0.15",
        "cafe/-141/30/foot-1.1-0.15",
        "cafe/129/22/top",
        "cafe/129/22/leg",
        "cafe/129/22/bench--1.1",
        "cafe/129/22/foot--1.1--0.15",
        "cafe/129/22/foot--1.1-0.15",
        "cafe/129/22/bench-1.1",
        "cafe/129/22/foot-1.1--0.15",
        "cafe/129/22/foot-1.1-0.15",
        "cafe/129/30/top",
        "cafe/129/30/leg",
        "cafe/129/30/bench--1.1",
        "cafe/129/30/foot--1.1--0.15",
        "cafe/129/30/foot--1.1-0.15",
        "cafe/129/30/bench-1.1",
        "cafe/129/30/foot-1.1--0.15",
        "cafe/129/30/foot-1.1-0.15",
        "cafe/141/22/top",
        "cafe/141/22/leg",
        "cafe/141/22/bench--1.1",
        "cafe/141/22/foot--1.1--0.15",
        "cafe/141/22/foot--1.1-0.15",
        "cafe/141/22/bench-1.1",
        "cafe/141/22/foot-1.1--0.15",
        "cafe/141/22/foot-1.1-0.15",
        "cafe/141/30/top",
        "cafe/141/30/leg",
        "cafe/141/30/bench--1.1",
        "cafe/141/30/foot--1.1--0.15",
        "cafe/141/30/foot--1.1-0.15",
        "cafe/141/30/bench-1.1",
        "cafe/141/30/foot-1.1--0.15",
        "cafe/141/30/foot-1.1-0.15"
      ]
    },
    "notes": [
      "The 1893 orange-tower photograph and planted Crystal Cave photograph supply display forms, not dimensions derived from perspective. The tower and hollow grotto are simplified authored assets.",
      "The structural galleries and open courts remain intact. Native low installation dividers split selected fruit bays; inferred potting/service rooms occupy end-pavilion corners.",
      "The old cafe tables/benches and two central palm assemblies must be hidden by the listed exact source IDs when these replacements are used. The surrounding original palms, ferns, courts and stairs remain.",
      "No new floor, basement, staircase, height change, invented surveyed exhibit allocation or actual cave admission behavior is introduced.",
      "Source-local +X right, +Z rear, +Y up; structural floors stay on 2.12 m native levels. Furniture dimensions are metres and are not stretched to grid sizes.",
      "Physical collision/fuel/material assignments and game integration remain consumer-owned. Room labels and route keepouts are descriptive evidence, not proof of runtime traversal."
    ],
    "prototypeIds": [
      "rock-grotto",
      "fruit-stand",
      "wardian-case",
      "cafe-table-set",
      "potting-bench",
      "orange-tower"
    ]
  },
  "fisheries": {
    "id": "landmark-interior-fisheries-v1",
    "version": 1,
    "venueId": "fisheries",
    "units": "metres",
    "occupiedLevels": [
      1,
      3
    ],
    "sourcePins": {
      "building": {
        "commit": "f75499a3ef60d6446a3885d0eb5c21882f27466b",
        "path": "assets/art/exposition-fisheries/index.js"
      }
    },
    "rooms": [
      {
        "id": "fish-gallery",
        "label": "Upper fisheries exhibit gallery",
        "level": 3,
        "polygon": [
          [
            -48,
            20
          ],
          [
            48,
            20
          ],
          [
            48,
            54
          ],
          [
            -48,
            54
          ]
        ],
        "sourceStatus": "Original gallery floor with a central open well; case positions adapted.",
        "sourceIds": [
          "INT-FISH-PLAN"
        ],
        "holes": [
          [
            [
              -40,
              26
            ],
            [
              40,
              26
            ],
            [
              40,
              48
            ],
            [
              -40,
              48
            ]
          ]
        ]
      },
      {
        "id": "fish-main",
        "label": "Fisheries trade and boat exhibits",
        "level": 1,
        "polygon": [
          [
            -56,
            12
          ],
          [
            56,
            12
          ],
          [
            56,
            62
          ],
          [
            -56,
            62
          ]
        ],
        "sourceStatus": "Exhibit types from original installation plan; positions adapted.",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling",
        "label": "Angling tackle pavilion",
        "level": 1,
        "polygon": [
          [
            -84.421822,
            25.272593
          ],
          [
            -85.944231,
            32.926262
          ],
          [
            -90.279686,
            39.414729
          ],
          [
            -96.768153,
            43.750184
          ],
          [
            -104.421822,
            45.272593
          ],
          [
            -112.075491,
            43.750184
          ],
          [
            -118.563958,
            39.414729
          ],
          [
            -122.899413,
            32.926262
          ],
          [
            -124.421822,
            25.272593
          ],
          [
            -122.899413,
            17.618925
          ],
          [
            -118.563958,
            11.130458
          ],
          [
            -112.075491,
            6.795003
          ],
          [
            -104.421822,
            5.272593
          ],
          [
            -96.768153,
            6.795003
          ],
          [
            -90.279686,
            11.130458
          ],
          [
            -85.944231,
            17.618925
          ]
        ],
        "sourceStatus": "Radial installation dividers from Conkey; native 12 m runs and case positions adapted.",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-aquarium",
        "label": "Concentric aquarium galleries",
        "level": 1,
        "polygon": [
          [
            124.421822,
            25.272593
          ],
          [
            122.899413,
            32.926262
          ],
          [
            118.563958,
            39.414729
          ],
          [
            112.075491,
            43.750184
          ],
          [
            104.421822,
            45.272593
          ],
          [
            96.768153,
            43.750184
          ],
          [
            90.279686,
            39.414729
          ],
          [
            85.944231,
            32.926262
          ],
          [
            84.421822,
            25.272593
          ],
          [
            85.944231,
            17.618925
          ],
          [
            90.279686,
            11.130458
          ],
          [
            96.768153,
            6.795003
          ],
          [
            104.421822,
            5.272593
          ],
          [
            112.075491,
            6.795003
          ],
          [
            118.563958,
            11.130458
          ],
          [
            122.899413,
            17.618925
          ]
        ],
        "sourceStatus": "Forbes director report supports two rings, darkened spectator aisle, service passage and central 26 ft pool.",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      }
    ],
    "walls": [
      {
        "id": "fish-main-stall--1-23",
        "a": [
          -48,
          23
        ],
        "b": [
          -40,
          23
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Exhibit partition interpretation",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-main-stall--1-51",
        "a": [
          -48,
          51
        ],
        "b": [
          -40,
          51
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Exhibit partition interpretation",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-main-stall-1-23",
        "a": [
          40,
          23
        ],
        "b": [
          48,
          23
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Exhibit partition interpretation",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-main-stall-1-51",
        "a": [
          40,
          51
        ],
        "b": [
          48,
          51
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Exhibit partition interpretation",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-radial-0",
        "a": [
          -98.87854486351611,
          27.568693983877992
        ],
        "b": [
          -87.79199047338066,
          32.16089517225907
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Native even-length adaptation of radial exhibit partitions",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-radial-1",
        "a": [
          -102.1257214643933,
          30.815870584755174
        ],
        "b": [
          -97.53352027601221,
          41.902424974890614
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Native even-length adaptation of radial exhibit partitions",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-radial-2",
        "a": [
          -106.71792265277436,
          30.815870584755174
        ],
        "b": [
          -111.31012384115544,
          41.902424974890614
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Native even-length adaptation of radial exhibit partitions",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-radial-3",
        "a": [
          -109.96509925365154,
          27.568693983877992
        ],
        "b": [
          -121.05165364378699,
          32.160895172259075
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Native even-length adaptation of radial exhibit partitions",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-radial-4",
        "a": [
          -109.96509925365154,
          22.976492795496917
        ],
        "b": [
          -121.05165364378699,
          18.38429160711584
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Native even-length adaptation of radial exhibit partitions",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-radial-5",
        "a": [
          -106.71792265277438,
          19.729316194619734
        ],
        "b": [
          -111.31012384115546,
          8.642761804484298
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Native even-length adaptation of radial exhibit partitions",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-radial-6",
        "a": [
          -102.1257214643933,
          19.729316194619734
        ],
        "b": [
          -97.53352027601221,
          8.642761804484294
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Native even-length adaptation of radial exhibit partitions",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-radial-7",
        "a": [
          -98.87854486351611,
          22.976492795496913
        ],
        "b": [
          -87.79199047338068,
          18.384291607115827
        ],
        "startLevel": 1,
        "endLevel": 2,
        "floorLevel": 1,
        "openings": [],
        "finish": "oak",
        "sourceStatus": "Native even-length adaptation of radial exhibit partitions",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      }
    ],
    "props": [
      {
        "id": "fish-skiff--36-26",
        "assetId": "skiff-on-cradle",
        "x": -36,
        "z": 26,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-skiff--36-48",
        "assetId": "skiff-on-cradle",
        "x": -36,
        "z": 48,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-skiff-36-26",
        "assetId": "skiff-on-cradle",
        "x": 36,
        "z": 26,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-skiff-36-48",
        "assetId": "skiff-on-cradle",
        "x": 36,
        "z": 48,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case--46-17",
        "assetId": "display-case",
        "x": -46,
        "z": 17,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case--46-57",
        "assetId": "display-case",
        "x": -46,
        "z": 57,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case--30-17",
        "assetId": "display-case",
        "x": -30,
        "z": 17,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case--30-57",
        "assetId": "display-case",
        "x": -30,
        "z": 57,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case--12-17",
        "assetId": "display-case",
        "x": -12,
        "z": 17,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case--12-57",
        "assetId": "display-case",
        "x": -12,
        "z": 57,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case-12-17",
        "assetId": "display-case",
        "x": 12,
        "z": 17,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case-12-57",
        "assetId": "display-case",
        "x": 12,
        "z": 57,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case-30-17",
        "assetId": "display-case",
        "x": 30,
        "z": 17,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case-30-57",
        "assetId": "display-case",
        "x": 30,
        "z": 57,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case-46-17",
        "assetId": "display-case",
        "x": 46,
        "z": 17,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-case-46-57",
        "assetId": "display-case",
        "x": 46,
        "z": 57,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-main",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-gallery-case--1-25",
        "assetId": "display-case",
        "x": -46.5,
        "z": 25,
        "level": 3,
        "yOffset": 0,
        "yaw": -1.570796,
        "roomId": "fish-gallery",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-gallery-case--1-33",
        "assetId": "display-case",
        "x": -46.5,
        "z": 33,
        "level": 3,
        "yOffset": 0,
        "yaw": -1.570796,
        "roomId": "fish-gallery",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-gallery-case--1-43",
        "assetId": "display-case",
        "x": -46.5,
        "z": 43,
        "level": 3,
        "yOffset": 0,
        "yaw": -1.570796,
        "roomId": "fish-gallery",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-gallery-case--1-51",
        "assetId": "display-case",
        "x": -46.5,
        "z": 51,
        "level": 3,
        "yOffset": 0,
        "yaw": -1.570796,
        "roomId": "fish-gallery",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-gallery-case-1-25",
        "assetId": "display-case",
        "x": 46.5,
        "z": 25,
        "level": 3,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "fish-gallery",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-gallery-case-1-33",
        "assetId": "display-case",
        "x": 46.5,
        "z": 33,
        "level": 3,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "fish-gallery",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-gallery-case-1-43",
        "assetId": "display-case",
        "x": 46.5,
        "z": 43,
        "level": 3,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "fish-gallery",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-gallery-case-1-51",
        "assetId": "display-case",
        "x": 46.5,
        "z": 51,
        "level": 3,
        "yOffset": 0,
        "yaw": 1.570796,
        "roomId": "fish-gallery",
        "sourceIds": [
          "INT-HORT-FRUIT",
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-rods-45",
        "assetId": "rod-case",
        "x": -94.522327,
        "z": 35.172088,
        "level": 1,
        "yOffset": 0,
        "yaw": 0.785398,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-net-45",
        "assetId": "net-and-buoy-rack",
        "x": -92.401007,
        "z": 37.293409,
        "level": 1,
        "yOffset": 0,
        "yaw": 0.785398,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-rods-90",
        "assetId": "rod-case",
        "x": -104.421822,
        "z": 39.272593,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-net-90",
        "assetId": "net-and-buoy-rack",
        "x": -104.421822,
        "z": 42.272593,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-rods-135",
        "assetId": "rod-case",
        "x": -114.321317,
        "z": 35.172088,
        "level": 1,
        "yOffset": 0,
        "yaw": -0.785398,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-net-135",
        "assetId": "net-and-buoy-rack",
        "x": -116.442637,
        "z": 37.293409,
        "level": 1,
        "yOffset": 0,
        "yaw": -0.785398,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-rods-180",
        "assetId": "rod-case",
        "x": -118.421822,
        "z": 25.272593,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.570796,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-net-180",
        "assetId": "net-and-buoy-rack",
        "x": -121.421822,
        "z": 25.272593,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.570796,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-rods-225",
        "assetId": "rod-case",
        "x": -114.321317,
        "z": 15.373098,
        "level": 1,
        "yOffset": 0,
        "yaw": -2.356194,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-net-225",
        "assetId": "net-and-buoy-rack",
        "x": -116.442637,
        "z": 13.251778,
        "level": 1,
        "yOffset": 0,
        "yaw": -2.356194,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-rods-315",
        "assetId": "rod-case",
        "x": -94.522327,
        "z": 15.373098,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.926991,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-angling-net-315",
        "assetId": "net-and-buoy-rack",
        "x": -92.401007,
        "z": 13.251778,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.926991,
        "roomId": "fish-angling",
        "sourceIds": [
          "INT-FISH-PLAN"
        ]
      },
      {
        "id": "fish-central-pool",
        "assetId": "aquarium-pool",
        "x": 104.421822,
        "z": 25.272593,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES",
          "INT-FISH-CONKEY"
        ]
      },
      {
        "id": "fish-inner-tank-0",
        "assetId": "aquarium-inner",
        "x": 114.027493,
        "z": 28.393665,
        "level": 1,
        "yOffset": 0,
        "yaw": 1.256637,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-inner-tank-1",
        "assetId": "aquarium-inner",
        "x": 110.358453,
        "z": 33.443665,
        "level": 1,
        "yOffset": 0,
        "yaw": 0.628319,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-inner-tank-2",
        "assetId": "aquarium-inner",
        "x": 104.421822,
        "z": 35.372593,
        "level": 1,
        "yOffset": 0,
        "yaw": 0,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-inner-tank-3",
        "assetId": "aquarium-inner",
        "x": 98.485191,
        "z": 33.443665,
        "level": 1,
        "yOffset": 0,
        "yaw": -0.628319,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-inner-tank-4",
        "assetId": "aquarium-inner",
        "x": 94.816151,
        "z": 28.393665,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.256637,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-inner-tank-5",
        "assetId": "aquarium-inner",
        "x": 94.816151,
        "z": 22.151522,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.884956,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-inner-tank-6",
        "assetId": "aquarium-inner",
        "x": 98.485191,
        "z": 17.101522,
        "level": 1,
        "yOffset": 0,
        "yaw": -2.513274,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-inner-tank-7",
        "assetId": "aquarium-inner",
        "x": 104.421822,
        "z": 15.172593,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.141593,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-inner-tank-8",
        "assetId": "aquarium-inner",
        "x": 110.358453,
        "z": 17.101522,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.769911,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-inner-tank-9",
        "assetId": "aquarium-inner",
        "x": 114.027493,
        "z": 22.151522,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.39823,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-0",
        "assetId": "aquarium-small",
        "x": 87.038507,
        "z": 22.519347,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.727876,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-1",
        "assetId": "aquarium-small",
        "x": 87.421528,
        "z": 20.717378,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.832596,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-2",
        "assetId": "aquarium-large",
        "x": 88.343422,
        "z": 18.114028,
        "level": 1,
        "yOffset": 0,
        "yaw": -1.989675,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-3",
        "assetId": "aquarium-large",
        "x": 90.183123,
        "z": 14.927573,
        "level": 1,
        "yOffset": 0,
        "yaw": -2.199115,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-4",
        "assetId": "aquarium-small",
        "x": 91.976743,
        "z": 12.827514,
        "level": 1,
        "yOffset": 0,
        "yaw": -2.356194,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-5",
        "assetId": "aquarium-small",
        "x": 93.345783,
        "z": 11.594824,
        "level": 1,
        "yOffset": 0,
        "yaw": -2.460914,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-6",
        "assetId": "aquarium-large",
        "x": 95.621822,
        "z": 10.030546,
        "level": 1,
        "yOffset": 0,
        "yaw": -2.617994,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-7",
        "assetId": "aquarium-small",
        "x": 98.114546,
        "z": 8.841578,
        "level": 1,
        "yOffset": 0,
        "yaw": -2.775074,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-8",
        "assetId": "aquarium-large",
        "x": 100.762576,
        "z": 8.057196,
        "level": 1,
        "yOffset": 0,
        "yaw": -2.932153,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-9",
        "assetId": "aquarium-small",
        "x": 107.175069,
        "z": 7.889279,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.298672,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-10",
        "assetId": "aquarium-small",
        "x": 108.977037,
        "z": 8.272299,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.403392,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-11",
        "assetId": "aquarium-small",
        "x": 110.729098,
        "z": 8.841578,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.508112,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-12",
        "assetId": "aquarium-small",
        "x": 112.412055,
        "z": 9.590879,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.612832,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-13",
        "assetId": "aquarium-small",
        "x": 114.007469,
        "z": 10.511991,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.717551,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-14",
        "assetId": "aquarium-small",
        "x": 115.497861,
        "z": 11.594824,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.822271,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-15",
        "assetId": "aquarium-small",
        "x": 116.866901,
        "z": 12.827514,
        "level": 1,
        "yOffset": 0,
        "yaw": -3.926991,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-16",
        "assetId": "aquarium-small",
        "x": 118.099591,
        "z": 14.196555,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.031711,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-17",
        "assetId": "aquarium-small",
        "x": 119.182424,
        "z": 15.686946,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.13643,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-18",
        "assetId": "aquarium-small",
        "x": 120.103537,
        "z": 17.282361,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.24115,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-19",
        "assetId": "aquarium-small",
        "x": 120.852838,
        "z": 18.965317,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.34587,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-20",
        "assetId": "aquarium-small",
        "x": 121.422117,
        "z": 20.717378,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.45059,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-21",
        "assetId": "aquarium-small",
        "x": 121.805137,
        "z": 22.519347,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.555309,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-22",
        "assetId": "aquarium-small",
        "x": 121.997702,
        "z": 24.351481,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.660029,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-23",
        "assetId": "aquarium-small",
        "x": 121.997702,
        "z": 26.193706,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.764749,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-24",
        "assetId": "aquarium-small",
        "x": 121.805137,
        "z": 28.02584,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.869469,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-25",
        "assetId": "aquarium-small",
        "x": 121.422117,
        "z": 29.827809,
        "level": 1,
        "yOffset": 0,
        "yaw": -4.974188,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-26",
        "assetId": "aquarium-small",
        "x": 120.852838,
        "z": 31.579869,
        "level": 1,
        "yOffset": 0,
        "yaw": -5.078908,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-27",
        "assetId": "aquarium-small",
        "x": 120.103537,
        "z": 33.262826,
        "level": 1,
        "yOffset": 0,
        "yaw": -5.183628,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-28",
        "assetId": "aquarium-large",
        "x": 118.660521,
        "z": 35.617614,
        "level": 1,
        "yOffset": 0,
        "yaw": -5.340708,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-29",
        "assetId": "aquarium-large",
        "x": 116.198521,
        "z": 38.351942,
        "level": 1,
        "yOffset": 0,
        "yaw": -5.550147,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-30",
        "assetId": "aquarium-large",
        "x": 113.221822,
        "z": 40.51464,
        "level": 1,
        "yOffset": 0,
        "yaw": -5.759587,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-31",
        "assetId": "aquarium-large",
        "x": 109.860521,
        "z": 42.011188,
        "level": 1,
        "yOffset": 0,
        "yaw": -5.969026,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-32",
        "assetId": "aquarium-large",
        "x": 106.261523,
        "z": 42.776179,
        "level": 1,
        "yOffset": 0,
        "yaw": -6.178466,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-33",
        "assetId": "aquarium-large",
        "x": 102.582121,
        "z": 42.776179,
        "level": 1,
        "yOffset": 0,
        "yaw": -6.387905,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-34",
        "assetId": "aquarium-large",
        "x": 98.983123,
        "z": 42.011188,
        "level": 1,
        "yOffset": 0,
        "yaw": -6.597345,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-35",
        "assetId": "aquarium-large",
        "x": 95.621822,
        "z": 40.51464,
        "level": 1,
        "yOffset": 0,
        "yaw": -6.806784,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-36",
        "assetId": "aquarium-large",
        "x": 92.645123,
        "z": 38.351942,
        "level": 1,
        "yOffset": 0,
        "yaw": -7.016224,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-37",
        "assetId": "aquarium-large",
        "x": 90.183123,
        "z": 35.617614,
        "level": 1,
        "yOffset": 0,
        "yaw": -7.225663,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-38",
        "assetId": "aquarium-large",
        "x": 88.343422,
        "z": 32.431158,
        "level": 1,
        "yOffset": 0,
        "yaw": -7.435103,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      },
      {
        "id": "fish-outer-tank-39",
        "assetId": "aquarium-large",
        "x": 87.206424,
        "z": 28.931839,
        "level": 1,
        "yOffset": 0,
        "yaw": -7.644542,
        "roomId": "fish-aquarium",
        "sourceIds": [
          "INT-FISH-FORBES"
        ]
      }
    ],
    "portals": [],
    "reservedRoutes": [
      {
        "id": "fish-main-stair--1-false",
        "level": 1,
        "points": [
          [
            -18,
            10
          ],
          [
            -18,
            22
          ]
        ],
        "width": 3.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-main-stair--1-true",
        "level": 1,
        "points": [
          [
            -18,
            64
          ],
          [
            -18,
            52
          ]
        ],
        "width": 3.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-main-stair-1-false",
        "level": 1,
        "points": [
          [
            18,
            10
          ],
          [
            18,
            22
          ]
        ],
        "width": 3.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-main-stair-1-true",
        "level": 1,
        "points": [
          [
            18,
            64
          ],
          [
            18,
            52
          ]
        ],
        "width": 3.8,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-main-cross-axis",
        "level": 1,
        "points": [
          [
            -56,
            37
          ],
          [
            56,
            37
          ]
        ],
        "width": 3.2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-main-front-axis",
        "level": 1,
        "points": [
          [
            0,
            0
          ],
          [
            0,
            74
          ]
        ],
        "width": 3.2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-angling-east-approach",
        "level": 1,
        "points": [
          [
            -84.421822,
            25.272593
          ],
          [
            -104.421822,
            25.272593
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-angling-south-approach",
        "level": 1,
        "points": [
          [
            -104.421822,
            5.272593
          ],
          [
            -104.421822,
            25.272593
          ]
        ],
        "width": 2,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-aquarium-entry-to-outer",
        "level": 1,
        "points": [
          [
            104.421822,
            5.272593
          ],
          [
            104.421822,
            11.072593
          ],
          [
            104.979311,
            11.083541
          ],
          [
            105.535941,
            11.116367
          ],
          [
            106.090853,
            11.171021
          ],
          [
            106.643191,
            11.247419
          ],
          [
            107.192105,
            11.345442
          ],
          [
            107.736746,
            11.464941
          ],
          [
            108.276276,
            11.605729
          ],
          [
            108.809863,
            11.767591
          ]
        ],
        "width": 1.7,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-aquarium-inner-connection",
        "level": 1,
        "points": [
          [
            108.809863,
            11.767591
          ],
          [
            106.430433,
            19.090726
          ]
        ],
        "width": 1.4,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-aquarium-west-connection",
        "level": 1,
        "points": [
          [
            84.421822,
            25.272593
          ],
          [
            97.921822,
            25.272593
          ]
        ],
        "width": 1.7,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-aquarium-outer-loop",
        "level": 1,
        "points": [
          [
            118.621822,
            25.272593
          ],
          [
            118.567787,
            26.510205
          ],
          [
            118.406092,
            27.738398
          ],
          [
            118.137969,
            28.947824
          ],
          [
            117.765457,
            30.129279
          ],
          [
            117.291393,
            31.273773
          ],
          [
            116.719383,
            32.372593
          ],
          [
            116.053781,
            33.417379
          ],
          [
            115.299653,
            34.400177
          ],
          [
            114.462738,
            35.31351
          ],
          [
            113.549406,
            36.150424
          ],
          [
            112.566607,
            36.904552
          ],
          [
            111.521822,
            37.570154
          ],
          [
            110.423001,
            38.142164
          ],
          [
            109.278508,
            38.616229
          ],
          [
            108.097052,
            38.98874
          ],
          [
            106.887626,
            39.256863
          ],
          [
            105.659434,
            39.418558
          ],
          [
            104.421822,
            39.472593
          ],
          [
            103.184211,
            39.418558
          ],
          [
            101.956018,
            39.256863
          ],
          [
            100.746592,
            38.98874
          ],
          [
            99.565136,
            38.616229
          ],
          [
            98.420643,
            38.142164
          ],
          [
            97.321822,
            37.570154
          ],
          [
            96.277037,
            36.904552
          ],
          [
            95.294238,
            36.150424
          ],
          [
            94.380906,
            35.31351
          ],
          [
            93.543991,
            34.400177
          ],
          [
            92.789863,
            33.417379
          ],
          [
            92.124261,
            32.372593
          ],
          [
            91.552251,
            31.273773
          ],
          [
            91.078187,
            30.129279
          ],
          [
            90.705675,
            28.947824
          ],
          [
            90.437552,
            27.738398
          ],
          [
            90.275857,
            26.510205
          ],
          [
            90.221822,
            25.272593
          ],
          [
            90.275857,
            24.034982
          ],
          [
            90.437552,
            22.806789
          ],
          [
            90.705675,
            21.597363
          ],
          [
            91.078187,
            20.415907
          ],
          [
            91.552251,
            19.271414
          ],
          [
            92.124261,
            18.172593
          ],
          [
            92.789863,
            17.127808
          ],
          [
            93.543991,
            16.145009
          ],
          [
            94.380906,
            15.231677
          ],
          [
            95.294238,
            14.394762
          ],
          [
            96.277037,
            13.640634
          ],
          [
            97.321822,
            12.975033
          ],
          [
            98.420643,
            12.403023
          ],
          [
            99.565136,
            11.928958
          ],
          [
            100.746592,
            11.556447
          ],
          [
            101.956018,
            11.288323
          ],
          [
            103.184211,
            11.126629
          ],
          [
            104.421822,
            11.072593
          ],
          [
            105.659434,
            11.126629
          ],
          [
            106.887626,
            11.288323
          ],
          [
            108.097052,
            11.556447
          ],
          [
            109.278508,
            11.928958
          ],
          [
            110.423001,
            12.403023
          ],
          [
            111.521822,
            12.975033
          ],
          [
            112.566607,
            13.640634
          ],
          [
            113.549406,
            14.394762
          ],
          [
            114.462738,
            15.231677
          ],
          [
            115.299653,
            16.145009
          ],
          [
            116.053781,
            17.127808
          ],
          [
            116.719383,
            18.172593
          ],
          [
            117.291393,
            19.271414
          ],
          [
            117.765457,
            20.415907
          ],
          [
            118.137969,
            21.597363
          ],
          [
            118.406092,
            22.806789
          ],
          [
            118.567787,
            24.034982
          ],
          [
            118.621822,
            25.272593
          ]
        ],
        "width": 1.6,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      },
      {
        "id": "fish-aquarium-inner-loop",
        "level": 1,
        "points": [
          [
            110.921822,
            25.272593
          ],
          [
            110.866214,
            26.121014
          ],
          [
            110.70034,
            26.954917
          ],
          [
            110.427039,
            27.760036
          ],
          [
            110.050987,
            28.522593
          ],
          [
            109.578619,
            29.229543
          ],
          [
            109.018016,
            29.868787
          ],
          [
            108.378771,
            30.42939
          ],
          [
            107.671822,
            30.901759
          ],
          [
            106.909264,
            31.27781
          ],
          [
            106.104146,
            31.551111
          ],
          [
            105.270242,
            31.716985
          ],
          [
            104.421822,
            31.772593
          ],
          [
            103.573402,
            31.716985
          ],
          [
            102.739498,
            31.551111
          ],
          [
            101.93438,
            31.27781
          ],
          [
            101.171822,
            30.901759
          ],
          [
            100.464873,
            30.42939
          ],
          [
            99.825628,
            29.868787
          ],
          [
            99.265025,
            29.229543
          ],
          [
            98.792657,
            28.522593
          ],
          [
            98.416605,
            27.760036
          ],
          [
            98.143304,
            26.954917
          ],
          [
            97.97743,
            26.121014
          ],
          [
            97.921822,
            25.272593
          ],
          [
            97.97743,
            24.424173
          ],
          [
            98.143304,
            23.59027
          ],
          [
            98.416605,
            22.785151
          ],
          [
            98.792657,
            22.022593
          ],
          [
            99.265025,
            21.315644
          ],
          [
            99.825628,
            20.676399
          ],
          [
            100.464873,
            20.115797
          ],
          [
            101.171822,
            19.643428
          ],
          [
            101.93438,
            19.267376
          ],
          [
            102.739498,
            18.994076
          ],
          [
            103.573402,
            18.828202
          ],
          [
            104.421822,
            18.772593
          ],
          [
            105.270242,
            18.828202
          ],
          [
            106.104146,
            18.994076
          ],
          [
            106.909264,
            19.267376
          ],
          [
            107.671822,
            19.643428
          ],
          [
            108.378771,
            20.115797
          ],
          [
            109.018016,
            20.676399
          ],
          [
            109.578619,
            21.315644
          ],
          [
            110.050987,
            22.022593
          ],
          [
            110.427039,
            22.785151
          ],
          [
            110.70034,
            23.59027
          ],
          [
            110.866214,
            24.424173
          ],
          [
            110.921822,
            25.272593
          ]
        ],
        "width": 1.6,
        "minimumHeight": 2.3,
        "kind": "descriptive art keepout; runtime traversal remains consumer-owned"
      }
    ],
    "replacements": {
      "hiddenSourceParts": [],
      "factoryOptions": {
        "includeExhibits": false
      }
    },
    "notes": [
      "Use the original Fisheries factory with includeExhibits:false before adding this complete replacement exhibit set. Original exterior, floors, doors, roof and gallery stairs remain unchanged.",
      "Forbes printed pp.145-146 support 50 tanks: 24 small + 16 large outer and 8 + 1 + 1 inner. The scanned page was visually checked because OCR misread 16 as 18. This model preserves the 40/10 count but simplifies the unequal inner bay sizes and exact original schedule.",
      "The unequal large inner tanks are simplified into ten independent double-faced bays with safe connecting gaps. Printed 15 ft passages inform the two ring aisles; detailed tank depths, glass engineering, hidden maintenance ladders and plumbing are omitted.",
      "The central pool is an above-floor display prop. A single bullet hit must destroy the struck glazed tank; this is an accepted user requirement. The artist supplies intact/destroyed presentation and stable tank IDs; the coder still owns bullet collision, authoritative destroyed state and persistence. Water spill, fallen glass and fish are static art cues, with no flooding, hazard, swimming or combustion rules implied.",
      "Source-local +X right, +Z rear, +Y up; structural floors stay on 2.12 m native levels. Furniture dimensions are metres and are not stretched to grid sizes.",
      "Physical collision/fuel/material assignments and game integration remain consumer-owned. Room labels and route keepouts are descriptive evidence, not proof of runtime traversal."
    ],
    "destructionRequirements": {
      "aquariumTanks": {
        "status": "user-approved",
        "requirementOrigin": "User requested aquarium tanks be destroyed when hit by a bullet.",
        "trigger": "bullet-hit",
        "hitsRequired": 1,
        "states": [
          "intact",
          "destroyed"
        ],
        "response": "Shattered glazing, drained water and static glass/debris art",
        "simulationOwner": "coder",
        "selectionPaddingMetres": 0.45
      }
    },
    "prototypeIds": [
      "skiff-on-cradle",
      "display-case",
      "rod-case",
      "net-and-buoy-rack",
      "aquarium-pool",
      "aquarium-inner",
      "aquarium-small",
      "aquarium-large"
    ]
  }
});
