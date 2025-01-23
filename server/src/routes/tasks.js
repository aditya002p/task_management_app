const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Task = require("../models/Task");

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @route   GET api/tasks
// @desc    Get all tasks
// @access  Private
router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const tasks = await Task.find({ user: req.user.id }).sort({ date: -1 });
    res.json(tasks);
  })
);

// @route   POST api/tasks
// @desc    Create a task
// @access  Private
router.post(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    // Validation
    if (!title || !description) {
      return res
        .status(400)
        .json({ msg: "Please provide title and description" });
    }

    const newTask = new Task({
      title,
      description,
      user: req.user.id,
      status: "pending",
    });

    const task = await newTask.save();
    res.json(task);
  })
);

// @route   PUT api/tasks/:id
// @desc    Update task status
// @access  Private
router.put(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Check ownership
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    task.status = status;
    const updatedTask = await task.save();
    res.json(updatedTask);
  })
);

// @route   DELETE api/tasks/:id
// @desc    Delete a task
// @access  Private
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
