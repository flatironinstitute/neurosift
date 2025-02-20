import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useUserManagement, NewUser, User } from "../useUserManagement";

interface UserManagementSectionProps {
  adminApiKey: string;
}

const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  adminApiKey,
}) => {
  const {
    users,
    loading,
    loadingApiKey,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserApiKey,
  } = useUserManagement(adminApiKey);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<NewUser>({
    name: "",
    email: "",
    researchDescription: "",
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newUserApiKey, setNewUserApiKey] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [selectedUserApiKey, setSelectedUserApiKey] = useState<string | null>(
    null,
  );
  const [selectedUserName, setSelectedUserName] = useState<string>("");

  useEffect(() => {
    if (adminApiKey) {
      fetchUsers();
    }
  }, [adminApiKey, fetchUsers]);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        researchDescription: user.researchDescription,
      });
    } else {
      setEditUser(null);
      setFormData({
        name: "",
        email: "",
        researchDescription: "",
      });
    }
    setOpenDialog(true);
    setNewUserApiKey(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditUser(null);
    setFormData({
      name: "",
      email: "",
      researchDescription: "",
    });
    setNewUserApiKey(null);
  };

  const handleSubmit = async () => {
    if (editUser) {
      await updateUser(editUser.userId, formData);
      setSuccessMessage("User updated successfully");
    } else {
      const newUser = await createUser(formData);
      if (newUser?.apiKey) {
        setNewUserApiKey(newUser.apiKey);
        setSuccessMessage("User created successfully");
      }
    }
    handleCloseDialog();
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  if (!adminApiKey) {
    return null;
  }

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">User Management</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog()}
        >
          Create User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Research Description</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.researchDescription}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        onClick={async () => {
                          const apiKey = await getUserApiKey(user.userId);
                          if (apiKey) {
                            setSelectedUserApiKey(apiKey);
                            setSelectedUserName(user.name);
                            setShowApiKeyDialog(true);
                          }
                        }}
                      >
                        View API Key
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleOpenDialog(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteConfirmDialog(true);
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog}
        onClose={() => setDeleteConfirmDialog(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{userToDelete?.name}"? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              if (userToDelete) {
                await deleteUser(userToDelete.userId);
                setDeleteConfirmDialog(false);
                setUserToDelete(null);
                setSuccessMessage("User deleted successfully");
                setTimeout(() => setSuccessMessage(null), 5000);
              }
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editUser ? "Edit User" : "Create User"}</DialogTitle>
        <DialogContent>
          {newUserApiKey && (
            <Alert severity="info" sx={{ mb: 2 }}>
              API Key: {newUserApiKey}
              <br />
              Please save this key as it won't be shown again.
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Research Description"
            fullWidth
            multiline
            rows={4}
            value={formData.researchDescription}
            onChange={(e) =>
              setFormData({ ...formData, researchDescription: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editUser ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog
        open={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
      >
        <DialogTitle>API Key for {selectedUserName}</DialogTitle>
        <DialogContent>
          {loadingApiKey ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                value={selectedUserApiKey || ""}
                label="API Key"
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (selectedUserApiKey) {
                navigator.clipboard.writeText(selectedUserApiKey);
                setSuccessMessage("API key copied to clipboard");
                setTimeout(() => setSuccessMessage(null), 3000);
              }
            }}
            color="primary"
          >
            Copy to Clipboard
          </Button>
          <Button onClick={() => setShowApiKeyDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserManagementSection;
