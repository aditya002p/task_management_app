import React, { useState } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
} from "@mui/material";

const TaskForm = ({ onTaskAdded }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Title and description are required");
      return;
    }

    try {
      setLoading(true);
      await onTaskAdded(formData);

      // Reset form after successful submission
      setFormData({
        title: "",
        description: "",
      });
      setError("");
    } catch (err) {
      const errorMessage =
        err.response?.data?.msg || "Failed to create task. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
      }}
    >
      <Typography
        variant="h5"
        sx={{
          mb: 2,
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        Create New Task
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <TextField
          label="Task Title"
          value={formData.title}
          onChange={(e) =>
            setFormData({
              ...formData,
              title: e.target.value,
            })
          }
          required
          fullWidth
          variant="outlined"
          error={!!error && !formData.title.trim()}
        />

        <TextField
          label="Task Description"
          value={formData.description}
          onChange={(e) =>
            setFormData({
              ...formData,
              description: e.target.value,
            })
          }
          multiline
          rows={3}
          required
          fullWidth
          variant="outlined"
          error={!!error && !formData.description.trim()}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Task"}
        </Button>
      </Box>
    </Paper>
  );
};

export default TaskForm;
