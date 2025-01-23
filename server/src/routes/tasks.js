const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Task = require("../models/Task");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Get all tasks
router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const tasks = await Task.find({ user: req.user.id }).sort({
      order: 1,
      date: -1,
    });
    res.json(tasks);
  })
);

// Create a task
router.post(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ msg: "Please provide title and description" });
    }

    // Find the maximum order for pending tasks
    const maxOrderTask = await Task.findOne({
      user: req.user.id,
      status: "pending",
    })
      .sort({ order: -1 })
      .limit(1);

    const newOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;

    const newTask = new Task({
      title,
      description,
      user: req.user.id,
      status: "pending",
      order: newOrder,
    });

    const task = await newTask.save();
    res.json(task);
  })
);

// Update task status and/or order
router.put(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const { status, order } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Check ownership
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    // Update status if provided and valid
    if (status && ["pending", "completed", "done"].includes(status)) {
      task.status = status;
    }

    // Update order if provided
    if (order !== undefined) task.order = order;

    const updatedTask = await task.save();
    res.json(updatedTask);
  })
);
// Bulk update tasks (for reordering)
router.put(
  "/bulk/reorder",
  auth,
  asyncHandler(async (req, res) => {
    const { tasks } = req.body;

    const bulkOps = tasks.map(({ _id, status, order }) => ({
      updateOne: {
        filter: { _id, user: req.user.id },
        update: { status, order },
      },
    }));

    await Task.bulkWrite(bulkOps);
    res.json({ msg: "Tasks updated successfully" });
  })
);

// Delete a task
router.delete(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Check ownership
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    await task.deleteOne();
    res.json({ msg: "Task removed" });
  })
);

module.exports = router;
