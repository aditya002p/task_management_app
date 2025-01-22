import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Alert,
  Paper,
  CircularProgress,
} from "@mui/material";
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  rectIntersection,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import axios from "axios";
import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";

const STATUSES = ["pending", "completed", "done"];

const columnColors = {
  done: "#f0fdf4",
  completed: "#fefce8",
  pending: "#ffffff",
};

const TaskBoard = () => {
  const [tasks, setTasks] = useState({
    pending: [],
    completed: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get("/api/tasks");
      const categorizedTasks = {
        pending: res.data.filter((task) => task.status === "pending"),
        completed: res.data.filter((task) => task.status === "completed"),
        done: res.data.filter((task) => task.status === "done"),
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

  const findTaskContainer = (id) => {
    if (!id) return null;
    
    const container = Object.keys(tasks).find(key => 
      tasks[key].some(task => task._id === id)
    );
    return container;
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    
    if (!over || !active) return;

    const activeContainer = findTaskContainer(active.id);
    const overContainer = STATUSES.includes(over.id) ? over.id : findTaskContainer(over.id);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setTasks(prev => {
      const activeTask = prev[activeContainer].find(
        task => task._id === active.id
      );

      if (!activeTask) return prev;

      // Remove from old container
      const newPrev = {
        ...prev,
        [activeContainer]: prev[activeContainer].filter(
          task => task._id !== active.id
        ),
      };

      // Add to new container
      newPrev[overContainer] = [
        ...prev[overContainer],
        { ...activeTask, status: overContainer }
      ];

      return newPrev;
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeContainer = findTaskContainer(active.id);
    const overContainer = STATUSES.includes(over.id) ? over.id : findTaskContainer(over.id);

    if (activeContainer !== overContainer) {
      try {
        await axios.put(`/api/tasks/${active.id}`, {
          status: overContainer,
        });
      } catch (err) {
        // Revert the change if the API call fails
        console.error("Error updating task status:", err);
        setError("Failed to update task status");
        fetchTasks(); // Refresh the tasks to show the original state
      }
    }

    setActiveId(null);
  };

  const handleTaskAdded = (newTask) => {
    setTasks(prev => ({
      ...prev,
      pending: [...prev.pending, newTask],
    }));
  };

  const handleDeleteTask = async (taskId, status) => {
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      setTasks(prev => ({
        ...prev,
        [status]: prev[status].filter(task => task._id !== taskId),
      }));
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("Failed to delete task");
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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 4 }}>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          collisionDetection={rectIntersection}
        >
          <Box sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2
          }}>
            {STATUSES.map((status) => (
              <Paper
                key={status}
                id={status}
                sx={{
                  p: 2,
                  bgcolor: columnColors[status],
                  minHeight: 200,
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, textTransform: "capitalize" }}>
                  {status} ({tasks[status].length})
                </Typography>
                <SortableContext 
                  items={tasks[status].map(task => task._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Box sx={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: 1,
                    flexGrow: 1,
                    minHeight: 100 
                  }}>
                    {tasks[status].map((task, index) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        index={index}
                        onDelete={(taskId) => handleDeleteTask(taskId, status)}
                      />
                    ))}
                  </Box>
                </SortableContext>
              </Paper>
            ))}
          </Box>

          <DragOverlay>
            {activeId && (
              <Paper sx={{ 
                p: 2, 
                bgcolor: "background.paper", 
                boxShadow: 3,
                width: "300px" 
              }}>
                {Object.values(tasks)
                  .flat()
                  .find(task => task._id === activeId)?.title}
              </Paper>
            )}
          </DragOverlay>
        </DndContext>
      </Box>
    </Container>
  );
};

export default TaskBoard;