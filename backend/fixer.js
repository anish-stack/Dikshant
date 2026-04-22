const Sequelize = require("sequelize");
const { Batch, VideoCourse, Subject } = require("./src/models");
const { Op } = Sequelize;

/*
======================================================
FIX VIDEO POSITION SUBJECT WISE INSIDE EACH BATCH
======================================================

Batch subjectId stored like:
"[134,135,136,47]"

Need:

Batch A has Subjects:
134,135,136

Each Subject should have independent positions:

Subject 134 videos => 1,2,3,4...
Subject 135 videos => 1,2,3,4...
Subject 136 videos => 1,2,3,4...

Not continuous global positions.
======================================================
*/
exports.fixer = async () => {
  try {
    console.log("Fixer Started...");

    // =====================================
    // GET ALL BATCHES
    // =====================================
    const batches = await Batch.findAll({
      raw: true,
    });

    console.log(
      `Total Batches Found => ${batches.length}`
    );

    // =====================================
    // LOOP ALL BATCHES
    // =====================================
    for (const batch of batches) {
      try {
        if (!batch) continue;

        let subjectIds = [];

        const raw = String(
          batch.subjectId || ""
        ).trim();

        console.log(
          "================================"
        );
        console.log(
          `Batch ID => ${batch.id}`
        );
        console.log(
          "Raw subjectId =>",
          raw
        );

        // ===============================
        // SAFE PARSE
        // ===============================
        try {
          let parsed = JSON.parse(raw);

          console.log(
            "First Parse =>",
            parsed
          );
          console.log(
            "Type =>",
            typeof parsed
          );

          // double encoded string
          if (
            typeof parsed ===
            "string"
          ) {
            parsed =
              JSON.parse(parsed);

            console.log(
              "Second Parse =>",
              parsed
            );
          }

          if (
            Array.isArray(parsed)
          ) {
            subjectIds = parsed
              .map(Number)
              .filter(
                (n) => !isNaN(n)
              );
          } else {
            const num =
              Number(parsed);

            if (!isNaN(num)) {
              subjectIds = [num];
            }
          }
        } catch (error) {
          console.log(
            "Parse Failed, Regex fallback"
          );

          subjectIds =
            raw
              .match(/\d+/g)
              ?.map(Number) ||
            [];
        }

        console.log(
          "Final Subject IDs =>",
          subjectIds
        );

        // ===============================
        // LOOP SUBJECTS
        // ===============================
        for (const subjectId of subjectIds) {
          const videos =
            await VideoCourse.findAll(
              {
                where: {
                  batchId:
                    batch.id,
                  subjectId:
                    subjectId,
                },
                order: [
                  ["id", "ASC"],
                ],
                raw: true,
              }
            );

          if (!videos.length) {
            console.log(
              `No Videos => Batch ${batch.id} Subject ${subjectId}`
            );
            continue;
          }

          console.log(
            `Fixing Batch ${batch.id} Subject ${subjectId} (${videos.length} videos)`
          );

          let counter = 1;

          for (const video of videos) {
            await VideoCourse.update(
              {
                position:
                  counter,
              },
              {
                where: {
                  id: video.id,
                },
              }
            );

            console.log(
              `Video ${video.id} => Position ${counter}`
            );

            counter++;
          }
        }

        console.log(
          `Batch ${batch.id} Done`
        );
        console.log(
          "================================"
        );
      } catch (batchError) {
        console.log(
          `Batch ${batch?.id} Error =>`,
          batchError
        );
      }
    }

    console.log(
      "All Batches Fixer Completed"
    );
  } catch (error) {
    console.log(
      "Fixer Global Error =>",
      error
    );
  }
};