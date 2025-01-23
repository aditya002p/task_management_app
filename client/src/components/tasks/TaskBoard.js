import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";

const STATUS_ORDER = ["pending", "completed", "done"];

const columnColors = {
  done: "#f0fdf4",
  completed: "#fefce8",
  pending: "#ffffff",
};

export default function TaskBoard() {
  const { isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState({
    pending: [],
    completed: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get("/tasks");
      const categorizedTasks = {
        pending: response.data.filter((task) => task.status === "pending"),
        completed: response.data.filter((task) => task.status === "completed"),
        done: response.data.filter((task) => task.status === "done"),
      };
      setTasks(categorizedTasks);
      setError("");
    } catch (err) {
      setError("Failed to fetch tasks");
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    setIsDragging(true);

    const container = findTaskContainer(active.id);
    if (container) {
      setActiveTask(tasks[container.status][container.taskIndex]);
    }
  };

  const findTaskContainer = (taskId) => {
    for (const status of STATUS_ORDER) {
      const taskIndex = tasks[status].findIndex((task) => task._id === taskId);
      if (taskIndex !== -1) return { status, taskIndex };
    }
    return null;
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);
    setIsDragging(false);

    if (!over) return;

    const activeContainer = findTaskContainer(active.id);
    const overContainer = STATUS_ORDER.includes(over.id)
      ? { status: over.id }
      : findTaskContainer(over.id);

    if (!activeContainer || !overContainer) return;

    // Determine the new status
    const newStatus = STATUS_ORDER.includes(over.id)
      ? over.id
      : overContainer.status;

    // If status is different, update the task
    if (activeContainer.status !== newStatus) {
      try {
        // Update task status in the database
        await api.put(`/tasks/${active.id}`, { status: newStatus });

        // Update local state
        const updatedTasks = { ...tasks };

        // Remove task from old status
        const movedTask = updatedTasks[activeContainer.status].find(
          (task) => task._id === active.id
        );

        updatedTasks[activeContainer.status] = updatedTasks[
          activeContainer.status
        ].filter((task) => task._id !== active.id);

        // Add to new status
        updatedTasks[newStatus] = [
          { ...movedTask, status: newStatus },
          ...updatedTasks[newStatus],
        ];

        // Update state
        setTasks(updatedTasks);
      } catch (err) {
        console.error("Failed to update task status:", err);
        setError("Failed to move task");
        fetchTasks(); // Revert to server state
      }
    }
  };

  const handleTaskAdded = async (taskData) => {
    try {
      const response = await api.post("/tasks", taskData);
      setTasks((prev) => ({
        ...prev,
        pending: [response.data, ...prev.pending],
      }));
      setError("");
    } catch (err) {
      setError("Failed to create task");
      console.error("Error creating task:", err);
    }
  };

  const handleDeleteClick = (taskId) => {
    setTaskToDelete(taskId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;

    try {
      await api.delete(`/tasks/${taskToDelete}`);

      setTasks((prev) => {
        const newTasks = { ...prev };
        Object.keys(newTasks).forEach((status) => {
          newTasks[status] = newTasks[status].filter(
            (task) => task._id !== taskToDelete
          );
        });
        return newTasks;
      });

      setError("");
    } catch (err) {
      setError("Failed to delete task");
      console.error("Error deleting task:", err);
    } finally {
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <TaskForm onTaskAdded={handleTaskAdded} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        aria-label="Task Board"
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
            mt: 4,
          }}
        >
          {STATUS_ORDER.map((status) => (
            <Paper
              key={status}
              id={status}
              role="region"
              aria-label={`${status} tasks`}
              sx={{
                p: 2,
                bgcolor: columnColors[status],
                minHeight: 200,
                borderRadius: 2,
                opacity: isDragging ? 0.7 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 2, textTransform: "capitalize" }}
              >
                {status} ({tasks[status].length})
              </Typography>

              <SortableContext
                items={tasks[status].map((task) => task._id)}
                strategy={verticalListSortingStrategy}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {tasks[status].map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onDelete={() => handleDeleteClick(task._id)}
                    />
                  ))}
                </Box>
              </SortableContext>
            </Paper>
          ))}
        </Box>

        <DragOverlay>
          {activeId && activeTask && (
            <Paper
              sx={{
                p: 2,
                bgcolor: "background.paper",
                boxShadow: 3,
                width: "300px",
              }}
            >
              <Typography variant="subtitle1">{activeTask.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {activeTask.description}
              </Typography>
            </Paper>
          )}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this task? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
