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
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";

const STATUSES = ["pending", "completed", "done"];

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
  const [updateLoading, setUpdateLoading] = useState(false);

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

  const findContainer = (id) => {
    if (!id) return null;
    return STATUSES.find((status) =>
      tasks[status].some((task) => task._id === id)
    );
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    const activeContainer = findContainer(active.id);
    const task = tasks[activeContainer].find((task) => task._id === active.id);
    setActiveTask(task);
  };

  const updateTaskStatus = async (taskId, newStatus, oldStatus) => {
    setUpdateLoading(true);
    try {
      // Optimistically update the UI
      setTasks((prev) => {
        const task = prev[oldStatus].find((t) => t._id === taskId);
        if (!task) return prev;

        return {
          ...prev,
          [oldStatus]: prev[oldStatus].filter((t) => t._id !== taskId),
          [newStatus]: [{ ...task, status: newStatus }, ...prev[newStatus]],
        };
      });

      // Make API call
      await api.put(`/tasks/${taskId}`, { status: newStatus });
    } catch (err) {
      // Revert the state if API call fails
      setError("Failed to update task status");
      console.error("Error updating task status:", err);

      // Revert the optimistic update
      setTasks((prev) => {
        const task = prev[newStatus].find((t) => t._id === taskId);
        if (!task) return prev;

        return {
          ...prev,
          [newStatus]: prev[newStatus].filter((t) => t._id !== taskId),
          [oldStatus]: [{ ...task, status: oldStatus }, ...prev[oldStatus]],
        };
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = STATUSES.includes(over.id)
      ? over.id
      : findContainer(over.id);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    // Update local state immediately for smooth UI
    setTasks((prev) => {
      const activeTask = prev[activeContainer].find(
        (task) => task._id === active.id
      );

      return {
        ...prev,
        [activeContainer]: prev[activeContainer].filter(
          (task) => task._id !== active.id
        ),
        [overContainer]: [
          { ...activeTask, status: overContainer },
          ...prev[overContainer],
        ],
      };
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);

    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = STATUSES.includes(over.id)
      ? over.id
      : findContainer(over.id);

    if (activeContainer !== overContainer) {
      // Update the database and handle any potential errors
      await updateTaskStatus(active.id, overContainer, activeContainer);
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

      {updateLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Updating task status...
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
            mt: 4,
          }}
        >
          {STATUSES.map((status) => (
            <Paper
              key={status}
              id={status}
              sx={{
                p: 2,
                bgcolor: columnColors[status],
                minHeight: 200,
                borderRadius: 2,
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
