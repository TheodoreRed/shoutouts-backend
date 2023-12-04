import express from "express";
import { getClient } from "../db";
import { ObjectId } from "mongodb";
import Shoutout from "../models/Shoutout";

const shoutoutRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

interface QueryObj {
  to?: string;
}

// get all Shoutouts
shoutoutRouter.get("/shoutouts", async (req, res) => {
  const name: string = req.query.name as string;
  const queryObj: QueryObj = {};

  if (name) {
    queryObj.to = name;
  }
  try {
    const client = await getClient();
    const cursor = client.db().collection<Shoutout>("shoutouts").find(queryObj);
    const results = await cursor.toArray();
    res.status(200).json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

// get Shoutout by ID
shoutoutRouter.get("/shoutouts/:id", async (req, res) => {
  try {
    const _id: ObjectId = new ObjectId(req.params.id);
    const client = await getClient();
    const shoutout = await client
      .db()
      .collection<Shoutout>("shoutouts")
      .findOne({ _id });
    if (shoutout) {
      res.status(200).json(shoutout);
    } else {
      res.status(404).json({ message: "Not Found" });
    }
  } catch (err) {
    errorResponse(err, res);
  }
});

// create new Shoutout
shoutoutRouter.post("/shoutouts", async (req, res) => {
  try {
    const shoutout: Shoutout = req.body;
    const client = await getClient();
    await client.db().collection<Shoutout>("shoutouts").insertOne(shoutout);
    res.status(201).json(shoutout);
  } catch (err) {
    errorResponse(err, res);
  }
});

// delete Shoutout by ID
shoutoutRouter.delete("/shoutouts/:id", async (req, res) => {
  try {
    const _id: ObjectId = new ObjectId(req.params.id);
    const client = await getClient();
    const result = await client
      .db()
      .collection<Shoutout>("shoutouts")
      .deleteOne({ _id });
    if (result.deletedCount) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ message: "Not Found" });
    }
  } catch (err) {
    errorResponse(err, res);
  }
});

// DELETE the whole thing
shoutoutRouter.delete("/shoutouts", async (req, res) => {
  try {
    const client = await getClient();
    const result = await client
      .db()
      .collection<Shoutout>("shoutouts")
      .deleteMany({});
    if (result.deletedCount) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ message: "No documents found to delete" });
    }
  } catch (err) {
    errorResponse(err, res);
  }
});

// replace / update Shoutout by ID
shoutoutRouter.put("/shoutouts/:id", async (req, res) => {
  try {
    const _id: ObjectId = new ObjectId(req.params.id);
    const updatedShoutout: Shoutout = req.body;
    delete updatedShoutout._id; // remove _id from body so we only have one.
    const client = await getClient();
    const result = await client
      .db()
      .collection<Shoutout>("shoutouts")
      .replaceOne({ _id }, updatedShoutout);
    if (result.modifiedCount) {
      updatedShoutout._id = _id;
      res.status(200).json(updatedShoutout);
    } else {
      res.status(404).json({ message: "Not Found" });
    }
  } catch (err) {
    errorResponse(err, res);
  }
});

// get top 5 shoutouts
shoutoutRouter.get("/top-five", async (req, res) => {
  try {
    const client = await getClient();
    const results = await client
      .db()
      .collection<Shoutout>("shoutouts")
      .aggregate([
        {
          $group: {
            _id: "$to",
            count: { $sum: 1 },
            id: { $first: "$_id" },
            to: { $first: "$to" },
          },
        },
        { $sort: { count: -1 } },
      ])
      .limit(5)
      .toArray()
      .then((results) => {
        res.set("Cache-Control", "public, max-age=60, s-maxage=120");
        res.json(results);
      });
    res.status(200).json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

export default shoutoutRouter;
