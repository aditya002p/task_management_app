import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, Typography, IconButton, Box } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const TaskCard = ({ task, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: task._id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
        position: "relative",
      }}
      {...attributes}
      {...listeners}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ flexGrow: 1, pr: 2 }}>
            <Typography variant="h6" component="div">
              {task.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {task.description}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Created: {new Date(task.date).toLocaleDateString()}
            </Typography>
          </Box>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            size="small"
            color="error"
            sx={{ flexShrink: 0 }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
