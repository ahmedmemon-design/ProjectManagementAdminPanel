import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import {
  Users,
  Building,
  Settings,
  LogOut,
  Search,
  Edit,
  Trash2,
  Eye,
  Shield,
  Mail,
  Calendar,
  Menu,
  X,
  UserCog,
  Briefcase,
  UserCheck,
  UserX,
  UserMinus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Filter,
  Info,
  Plus,
  Home,
  Star,
  Crown,
  TrendingUp,
  Users as UsersIcon,
  Package,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';
import './App.css'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Data states
  const [users, setUsers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI states
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [actionType, setActionType] = useState(''); // 'delete_user' or 'remove_from_workspace'
  const [actionLoading, setActionLoading] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [notification, setNotification] = useState(null);
  const [showAddToWorkspaceModal, setShowAddToWorkspaceModal] = useState(false);
  const [selectedUserForAdd, setSelectedUserForAdd] = useState(null);
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false);

  // Notification system
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Authentication
  const handleLogin = (e) => {
    e.preventDefault();
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    
    if (password === adminPassword) {
      setIsAuthenticated(true);
      setError('');
      fetchAllData();
      showNotification('Welcome to Admin Dashboard!', 'success');
    } else {
      setError('Invalid admin password');
      showNotification('Invalid password. Please try again.', 'error');
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Fetch workspaces
      const { data: workspacesData } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Fetch workspace members with user and workspace details
      const { data: membersData } = await supabase
        .from('workspace_members')
        .select(`
          *,
          user:profiles(id, name, email, role),
          workspace:workspaces(id, name)
        `);
      
      setUsers(usersData || []);
      setWorkspaces(workspacesData || []);
      setWorkspaceMembers(membersData || []);
      
      if (!usersData?.length) {
        showNotification('No users found in database', 'info');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Failed to load data. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update user role in profiles table
  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (!error) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        
        // Also update in workspace_members if user exists there
        const userWorkspaceMembers = workspaceMembers.filter(member => member.user_id === userId);
        for (const member of userWorkspaceMembers) {
          await supabase
            .from('workspace_members')
            .update({ role: newRole })
            .eq('id', member.id);
        }
        
        // Update local state
        setWorkspaceMembers(prev => prev.map(member => 
          member.user_id === userId ? { ...member, role: newRole } : member
        ));
        
        showNotification(`User role updated to ${newRole}`, 'success');
      } else {
        showNotification('Failed to update role', 'error');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification('Error updating role', 'error');
    }
  };

  // COMPLETELY DELETE USER FROM SYSTEM
  const deleteUser = async (userId) => {
    setActionLoading(true);
    try {
      // First, delete user from all workspaces (workspace_members)
      const { error: memberError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('user_id', userId);
      
      if (memberError) {
        console.error('Error removing user from workspaces:', memberError);
      }
      
      // Then delete user from profiles table
      const { error: userError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (!userError) {
        // Update local state
        setUsers(users.filter(user => user.id !== userId));
        setWorkspaceMembers(workspaceMembers.filter(member => member.user_id !== userId));
        
        // Show success notification
        showNotification('User deleted successfully from system!', 'success');
        setShowDeleteModal(false);
        setSelectedUser(null);
      } else {
        showNotification('Error deleting user', 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('Error deleting user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Remove user from specific workspace only
  const removeUserFromWorkspace = async (memberId, userId, workspaceId) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);
      
      if (!error) {
        // Update local state
        setWorkspaceMembers(workspaceMembers.filter(member => member.id !== memberId));
        
        // Get user and workspace names for notification
        const user = users.find(u => u.id === userId);
        const workspace = workspaces.find(w => w.id === workspaceId);
        
        // Show success notification
        showNotification(`${user?.name || 'User'} removed from ${workspace?.name || 'workspace'}`, 'success');
        setShowRemoveModal(false);
        setSelectedMember(null);
      } else {
        showNotification('Error removing user from workspace', 'error');
      }
    } catch (error) {
      console.error('Error removing from workspace:', error);
      showNotification('Error removing user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Add user to workspace
  const addUserToWorkspace = async (userId, workspaceId, role = 'member') => {
    try {
      // Check if user is already in workspace
      const existingMember = workspaceMembers.find(
        member => member.user_id === userId && member.workspace_id === workspaceId
      );
      
      if (existingMember) {
        showNotification('User is already in this workspace', 'info');
        return { success: false };
      }
      
      const { data, error } = await supabase
        .from('workspace_members')
        .insert([
          {
            user_id: userId,
            workspace_id: workspaceId,
            role: role
          }
        ])
        .select(`
          *,
          user:profiles(id, name, email, role),
          workspace:workspaces(id, name)
        `)
        .single();
      
      if (!error && data) {
        setWorkspaceMembers([...workspaceMembers, data]);
        
        // Get user and workspace names for notification
        const user = users.find(u => u.id === userId);
        const workspace = workspaces.find(w => w.id === workspaceId);
        
        showNotification(`${user?.name || 'User'} added to ${workspace?.name || 'workspace'} as ${role}`, 'success');
        setShowAddToWorkspaceModal(false);
        setSelectedUserForAdd(null);
      } else {
        showNotification('Error adding user to workspace', 'error');
      }
      return { success: !error, error };
    } catch (error) {
      console.error('Error adding to workspace:', error);
      showNotification('Error adding user to workspace', 'error');
      return { success: false, error };
    }
  };

  // Update member role in workspace
  const updateMemberRole = async (memberId, newRole) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('id', memberId);
      
      if (!error) {
        setWorkspaceMembers(workspaceMembers.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        ));
        showNotification('Role updated successfully!', 'success');
      } else {
        showNotification('Error updating role', 'error');
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      showNotification('Error updating role', 'error');
    }
  };

  // DELETE COMPLETE WORKSPACE
  const deleteWorkspace = async (workspaceId) => {
    setActionLoading(true);
    try {
      // First, delete all members from workspace_members
      const { error: membersError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId);
      
      if (membersError) {
        console.error('Error removing workspace members:', membersError);
      }
      
      // Then delete the workspace itself
      const { error: workspaceError } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);
      
      if (!workspaceError) {
        // Update local state
        const workspaceName = workspaces.find(ws => ws.id === workspaceId)?.name;
        setWorkspaces(workspaces.filter(ws => ws.id !== workspaceId));
        setWorkspaceMembers(workspaceMembers.filter(member => member.workspace_id !== workspaceId));
        
        showNotification(`Workspace "${workspaceName}" deleted successfully!`, 'success');
      } else {
        showNotification('Error deleting workspace', 'error');
      }
    } catch (error) {
      console.error('Error deleting workspace:', error);
      showNotification('Error deleting workspace', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  // Filter workspaces based on search
  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get user's workspaces count
  const getUserWorkspacesCount = (userId) => {
    return workspaceMembers.filter(member => member.user_id === userId).length;
  };

  // Get user's workspaces list
  const getUserWorkspaces = (userId) => {
    return workspaceMembers
      .filter(member => member.user_id === userId)
      .map(member => {
        const workspace = workspaces.find(ws => ws.id === member.workspace_id);
        return workspace ? { ...workspace, memberRole: member.role, memberId: member.id } : null;
      })
      .filter(Boolean);
  };

  // Get workspace members count
  const getWorkspaceMembersCount = (workspaceId) => {
    return workspaceMembers.filter(member => member.workspace_id === workspaceId).length;
  };

  // Get workspace members list
  const getWorkspaceMembers = (workspaceId) => {
    return workspaceMembers
      .filter(member => member.workspace_id === workspaceId)
      .map(member => ({
        ...member,
        user: users.find(u => u.id === member.user_id)
      }));
  };

  // Get creator name
  const getCreatorName = (userId) => {
    const creator = users.find(u => u.id === userId);
    return creator?.name || 'Unknown';
  };

  // Handle user deletion confirmation
  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setActionType('delete_user');
    setShowDeleteModal(true);
  };

  // Handle remove from workspace confirmation
  const handleRemoveFromWorkspace = (member) => {
    setSelectedMember(member);
    setActionType('remove_from_workspace');
    setShowRemoveModal(true);
  };

  // Handle workspace deletion confirmation
  const handleDeleteWorkspace = (workspace) => {
    setSelectedWorkspace(workspace);
    setActionType('delete_workspace');
    setShowDeleteModal(true);
  };

  // Handle add user to workspace
  const handleAddUserToWorkspace = (workspace) => {
    setSelectedWorkspace(workspace);
    setShowAddToWorkspaceModal(true);
  };

  // Confirm action modal
  const confirmAction = () => {
    if (actionType === 'delete_user' && selectedUser) {
      deleteUser(selectedUser.id);
    } else if (actionType === 'remove_from_workspace' && selectedMember) {
      removeUserFromWorkspace(
        selectedMember.id,
        selectedMember.user_id,
        selectedMember.workspace_id
      );
    } else if (actionType === 'delete_workspace' && selectedWorkspace) {
      deleteWorkspace(selectedWorkspace.id);
      setShowDeleteModal(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    showNotification('Logged out successfully', 'info');
  };

  // Navigation items for sidebar and header
  const navItems = [
    { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" /> },
    { id: 'workspaces', label: 'Workspaces', icon: <Building className="w-5 h-5" /> },
    { id: 'members', label: 'Workspace Members', icon: <UserCog className="w-5 h-5" /> },
    { id: 'stats', label: 'Statistics', icon: <TrendingUp className="w-5 h-5" /> },
  ];

  // Get active tab label
  const getActiveTabLabel = () => {
    const activeItem = navItems.find(item => item.id === activeTab);
    return activeItem ? activeItem.label : 'Dashboard';
  };

  // Login page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-16 mx-auto mb-4"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/64?text=Logo";
              }}
            />
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 mt-2">Enter admin password to continue</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter admin password"
                required
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-300"
            >
              Enter Admin Panel
            </motion.button>
          </form>
          
          <p className="text-gray-500 text-sm text-center mt-6">
            Access restricted to authorized personnel only
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Notification System */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
              notification.type === 'success' ? 'bg-green-600' :
              notification.type === 'error' ? 'bg-red-600' :
              notification.type === 'info' ? 'bg-blue-600' :
              'bg-gray-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {notification.type === 'error' && <XCircle className="w-5 h-5" />}
              {notification.type === 'info' && <Info className="w-5 h-5" />}
              <p className="font-medium">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal - Reusable for all actions */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <div>
                  <h3 className="text-xl font-bold">
                    {actionType === 'delete_user' ? 'Delete User' : 
                     actionType === 'delete_workspace' ? 'Delete Workspace' : 
                     'Confirm Action'}
                  </h3>
                  <p className="text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6 p-4 bg-gray-900 rounded-lg">
                {actionType === 'delete_user' && selectedUser && (
                  <>
                    <p className="mb-2">
                      Are you sure you want to delete <span className="font-bold text-blue-300">{selectedUser.name}</span>?
                    </p>
                    <p className="text-sm text-gray-400">
                      This will permanently remove the user from:
                    </p>
                    <ul className="text-sm text-gray-400 list-disc pl-5 mt-2">
                      <li>All workspaces ({getUserWorkspacesCount(selectedUser.id)} workspaces)</li>
                      <li>User profiles database</li>
                      <li>Entire system</li>
                    </ul>
                    {getUserWorkspacesCount(selectedUser.id) > 0 && (
                      <div className="mt-3 p-2 bg-red-900/30 rounded border border-red-800">
                        <p className="text-xs text-red-300">
          ⚠️ User is currently in {getUserWorkspacesCount(selectedUser.id)} workspace(s)
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {actionType === 'delete_workspace' && selectedWorkspace && (
                  <>
                    <p className="mb-2">
                      Delete workspace <span className="font-bold text-green-300">"{selectedWorkspace.name}"</span>?
                    </p>
                    <p className="text-sm text-gray-400">
                      This will affect:
                    </p>
                    <ul className="text-sm text-gray-400 list-disc pl-5 mt-2">
                      <li>All members ({getWorkspaceMembersCount(selectedWorkspace.id)} users)</li>
                      <li>Workspace data and settings</li>
                      <li>All workspace associations</li>
                    </ul>
                    {getWorkspaceMembersCount(selectedWorkspace.id) > 0 && (
                      <div className="mt-3 p-2 bg-red-900/30 rounded border border-red-800">
                        <p className="text-xs text-red-300">
          ⚠️ This workspace has {getWorkspaceMembersCount(selectedWorkspace.id)} members
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                    setSelectedWorkspace(null);
                  }}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-300"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition duration-300 flex items-center justify-center"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {actionType === 'delete_user' ? 'Delete User' : 
                       actionType === 'delete_workspace' ? 'Delete Workspace' : 
                       'Confirm'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove from Workspace Modal */}
      <AnimatePresence>
        {showRemoveModal && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center space-x-3 mb-4">
                <UserMinus className="w-10 h-10 text-orange-500" />
                <div>
                  <h3 className="text-xl font-bold">Remove from Workspace</h3>
                  <p className="text-gray-400">Remove user from specific workspace</p>
                </div>
              </div>
              
              <div className="mb-6 p-4 bg-gray-900 rounded-lg">
                <p className="mb-3">
                  Remove <span className="font-bold text-blue-300">{selectedMember.user?.name}</span> from <span className="font-bold text-green-300">{selectedMember.workspace?.name}</span>?
                </p>
                <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    {selectedMember.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium">{selectedMember.user?.name}</p>
                    <p className="text-sm text-gray-400">Current role: {selectedMember.role}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-3">
                  Note: User will only be removed from this workspace, not deleted from the system.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRemoveModal(false);
                    setSelectedMember(null);
                  }}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-300"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeUserFromWorkspace(
                      selectedMember.id,
                      selectedMember.user_id,
                      selectedMember.workspace_id
                    );
                  }}
                  className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition duration-300 flex items-center justify-center"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <UserMinus className="w-4 h-4 mr-2" />
                      Remove from Workspace
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add User to Workspace Modal */}
      <AnimatePresence>
        {showAddToWorkspaceModal && selectedWorkspace && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center space-x-3 mb-4">
                <UserCheck className="w-10 h-10 text-green-500" />
                <div>
                  <h3 className="text-xl font-bold">Add User to Workspace</h3>
                  <p className="text-gray-400">Add a user to {selectedWorkspace.name}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Select User</label>
                <select
                  value={selectedUserForAdd?.id || ''}
                  onChange={(e) => {
                    const userId = e.target.value;
                    const user = users.find(u => u.id === userId);
                    setSelectedUserForAdd(user);
                  }}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a user...</option>
                  {users
                    .filter(user => {
                      // Filter out users already in this workspace
                      return !workspaceMembers.some(
                        member => member.user_id === user.id && member.workspace_id === selectedWorkspace.id
                      );
                    })
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) - {user.role}
                      </option>
                    ))}
                </select>
              </div>
            
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowAddToWorkspaceModal(false);
                    setSelectedWorkspace(null);
                    setSelectedUserForAdd(null);
                  }}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedUserForAdd) {
                      addUserToWorkspace(selectedUserForAdd.id, selectedWorkspace.id, newMemberRole);
                    } else {
                      showNotification('Please select a user first', 'info');
                    }
                  }}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition duration-300 flex items-center justify-center"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Add to Workspace
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header with Navigation */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="px-4 py-3">
          {/* Top Row - Logo and Actions */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-700 z-50"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="flex items-center space-x-3">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="h-8"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/32?text=Logo";
                  }}
                />
                <div>
                  <h1 className="text-lg font-bold">Admin Dashboard</h1>
                  <p className="text-xs text-gray-400">Project Management System</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchAllData}
                className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-300 text-sm"
                title="Refresh Data"
              >
                <Upload className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition duration-300 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Bottom Row - Navigation and Current Section */}
          <div className="flex items-center justify-between">
            {/* Current Section Title */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-2 text-gray-300">
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">{getActiveTabLabel()}</span>
              </div>
              
              {/* Mobile Current Section */}
              <div className="md:hidden flex items-center space-x-2">
                <span className="font-medium text-sm">{getActiveTabLabel()}</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSearchQuery('');
                    setFilterRole('all');
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition duration-300 ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Mobile Navigation Dropdown */}
            <div className="md:hidden relative">
              <button
                onClick={() => setShowHeaderDropdown(!showHeaderDropdown)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-300"
              >
                <span className="text-sm">Navigate</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                  showHeaderDropdown ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {showHeaderDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50"
                  >
                    <div className="py-1">
                      {navItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setSearchQuery('');
                            setFilterRole('all');
                            setShowHeaderDropdown(false);
                          }}
                          className={`flex items-center space-x-3 w-full px-4 py-3 text-left transition duration-300 ${
                            activeTab === item.id
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-700 text-gray-300'
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                          {item.id === 'users' && (
                            <span className="ml-auto text-xs bg-gray-700 px-2 py-1 rounded-full">
                              {users.length}
                            </span>
                          )}
                          {item.id === 'workspaces' && (
                            <span className="ml-auto text-xs bg-gray-700 px-2 py-1 rounded-full">
                              {workspaces.length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Mobile Only */}
        <motion.aside
          initial={false}
          animate={{ 
            x: isMobileMenuOpen ? 0 : -300,
            width: isMobileMenuOpen ? 250 : 0 
          }}
          className={`fixed lg:hidden h-[calc(100vh-7rem)] bg-gray-800 border-r border-gray-700 overflow-y-auto z-40 ${
            isMobileMenuOpen ? 'block' : 'hidden'
          }`}
        >
          <nav className="p-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                    setSearchQuery('');
                    setFilterRole('all');
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-300 ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.id === 'users' && (
                    <span className="ml-auto bg-gray-700 text-xs px-2 py-1 rounded-full">
                      {users.length}
                    </span>
                  )}
                  {item.id === 'workspaces' && (
                    <span className="ml-auto bg-gray-700 text-xs px-2 py-1 rounded-full">
                      {workspaces.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h3 className="text-xs uppercase text-gray-500 font-semibold mb-3">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Users</span>
                  <span className="font-bold">{users.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Workspaces</span>
                  <span className="font-bold">{workspaces.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Memberships</span>
                  <span className="font-bold">{workspaceMembers.length}</span>
                </div>
              </div>
            </div>
          </nav>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-auto">
          {/* Search and Filter Bar */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'users' ? 'Search users by name or email...' :
                    activeTab === 'workspaces' ? 'Search workspaces...' :
                    activeTab === 'members' ? 'Search members or workspaces...' :
                    'Search...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {activeTab === 'users' && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admins</option>
                      <option value="member">Members</option>
                      <option value="client">Clients</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-400">Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Users Tab */}
              {activeTab === 'users' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-700">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                      <div>
                        <h3 className="text-xl font-bold">All Users</h3>
                        <p className="text-gray-400">Manage user accounts and permissions</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="px-3 py-1 bg-gray-900 rounded-full text-sm">
                          <span className="text-gray-400">Showing </span>
                          <span className="font-bold">{filteredUsers.length}</span>
                          <span className="text-gray-400"> of {users.length} users</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <UserX className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No users found</p>
                      <p className="text-sm">Try changing your search or filter</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-900">
                          <tr>
                            <th className="p-4 text-left">User</th>
                            <th className="p-4 text-left">Email</th>
                            <th className="p-4 text-left">Role</th>
                            <th className="p-4 text-left">Workspaces</th>
                            <th className="p-4 text-left">Joined</th>
                            <th className="p-4 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((user) => {
                            const userWorkspaces = getUserWorkspaces(user.id);
                            const userWorkspacesCount = userWorkspaces.length;
                            
                            return (
                              <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-750">
                                <td className="p-4">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                      user.role === 'admin' ? 'bg-red-600' :
                                      user.role === 'client' ? 'bg-purple-600' :
                                      'bg-blue-600'
                                    }`}>
                                      {user.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                      <p className="font-medium">{user.name || 'No Name'}</p>
                                      <p className="text-sm text-gray-400">ID: {user.id.substring(0, 8)}...</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center space-x-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span>{user.email}</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center space-x-2">
                                    <select
                                      value={user.role || 'member'}
                                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                                      className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                                    >
                                      <option value="admin">Admin</option>
                                      <option value="member">Member</option>
                                      <option value="client">Client</option>
                                    </select>
                                    {user.role === 'admin' && <Crown className="w-4 h-4 text-yellow-500" />}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center space-x-2">
                                    <Building className="w-4 h-4 text-gray-400" />
                                    <div>
                                      <div className="flex items-center space-x-1">
                                        <span className="font-medium">{userWorkspacesCount}</span>
                                        <span className="text-sm text-gray-400">
                                          {userWorkspacesCount === 1 ? 'workspace' : 'workspaces'}
                                        </span>
                                      </div>
                                      {userWorkspacesCount > 0 && (
                                        <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">
                                          {userWorkspaces.slice(0, 2).map(ws => ws.name).join(', ')}
                                          {userWorkspacesCount > 2 && ` +${userWorkspacesCount - 2} more`}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center space-x-2 text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>{new Date(user.created_at).toLocaleDateString()}</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        if (userWorkspacesCount > 0) {
                                          showNotification(
                                            `${user.name} is in ${userWorkspacesCount} workspace(s)`,
                                            'info'
                                          );
                                        } else {
                                          showNotification(`${user.name} is not in any workspace`, 'info');
                                        }
                                      }}
                                      className="p-2 hover:bg-gray-700 rounded-lg transition duration-300 group"
                                      title="View Workspaces"
                                    >
                                      <Eye className="w-4 h-4 group-hover:text-blue-400" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(user)}
                                      className="p-2 hover:bg-red-700 rounded-lg transition duration-300 group"
                                      title="Delete User Completely"
                                    >
                                      <Trash2 className="w-4 h-4 group-hover:text-red-300" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                    </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Workspaces Tab */}
              {activeTab === 'workspaces' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-700">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                      <div>
                        <h3 className="text-xl font-bold">All Workspaces</h3>
                        <p className="text-gray-400">Manage workspaces and their members</p>
                      </div>
                      <div className="px-3 py-1 bg-gray-900 rounded-full text-sm">
                        <span className="text-gray-400">Total: </span>
                        <span className="font-bold">{workspaces.length}</span>
                        <span className="text-gray-400"> workspaces</span>
                      </div>
                    </div>
                  </div>
                  
                  {filteredWorkspaces.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Building className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No workspaces found</p>
                      <p className="text-sm">Try changing your search</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                      {filteredWorkspaces.map((workspace) => {
                        const membersCount = getWorkspaceMembersCount(workspace.id);
                        const creatorName = getCreatorName(workspace.created_by);
                        const workspaceMembersList = getWorkspaceMembers(workspace.id);
                        
                        return (
                          <div key={workspace.id} className="bg-gray-900 rounded-xl p-5 border border-gray-700 hover:border-blue-500 transition duration-300 group">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition duration-300">
                                  <Building className="w-6 h-6" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">{workspace.name}</h3>
                                  <p className="text-sm text-gray-400">
                                    Created by: {creatorName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm">
                                  {membersCount} {membersCount === 1 ? 'member' : 'members'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(workspace.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            
                            {/* Members List */}
                            {workspaceMembersList.length > 0 && (
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm text-gray-400">Members:</p>
                                  <span className="text-xs text-gray-500">{membersCount} total</span>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                  {workspaceMembersList.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between text-sm p-2 hover:bg-gray-800 rounded-lg">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-xs">
                                          {member.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                          <p className="font-medium">{member.user?.name || 'Unknown'}</p>
                                          <p className="text-xs text-gray-500">{member.role}</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveFromWorkspace(member)}
                                        className="p-1.5 hover:bg-red-900 rounded-lg transition duration-300 group/remove"
                                        title={`Remove ${member.user?.name} from workspace`}
                                      >
                                        <UserMinus className="w-4 h-4 text-gray-400 group-hover/remove:text-red-300" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAddUserToWorkspace(workspace)}
                                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg transition duration-300 flex items-center justify-center text-sm font-medium"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add User
                              </button>
                              <button
                                onClick={() => handleDeleteWorkspace(workspace)}
                                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg transition duration-300 text-sm font-medium"
                                title="Delete Workspace"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Workspace Members Tab */}
              {activeTab === 'members' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-700">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                      <div>
                        <h3 className="text-xl font-bold">Workspace Memberships</h3>
                        <p className="text-gray-400">Manage user memberships across workspaces</p>
                      </div>
                      <div className="px-3 py-1 bg-gray-900 rounded-full text-sm">
                        <span className="text-gray-400">Total: </span>
                        <span className="font-bold">{workspaceMembers.length}</span>
                        <span className="text-gray-400"> memberships</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="p-4 text-left">User</th>
                          <th className="p-4 text-left">Workspace</th>
                          <th className="p-4 text-left">Role</th>
                          <th className="p-4 text-left">Joined</th>
                          <th className="p-4 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workspaceMembers
                          .filter(member => {
                            const user = member.user || users.find(u => u.id === member.user_id);
                            const workspace = member.workspace || workspaces.find(w => w.id === member.workspace_id);
                            
                            if (!user || !workspace) return false;
                            
                            return (
                              user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              workspace.name?.toLowerCase().includes(searchQuery.toLowerCase())
                            );
                          })
                          .map((member) => {
                            const user = member.user || users.find(u => u.id === member.user_id);
                            const workspace = member.workspace || workspaces.find(w => w.id === member.workspace_id);
                            
                            if (!user || !workspace) return null;
                            
                            return (
                              <tr key={member.id} className="border-b border-gray-700 hover:bg-gray-750 group">
                                <td className="p-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                                      {user.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                      <p className="font-medium">{user.name}</p>
                                      <p className="text-sm text-gray-400">{user.email}</p>
                                      <p className="text-xs text-gray-500">
                                        Global: {user.role}
                                        {user.role === 'admin' && <Crown className="w-3 h-3 inline ml-1 text-yellow-500" />}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center space-x-2">
                                    <Building className="w-4 h-4 text-gray-400" />
                                    <div>
                                      <p className="font-medium">{workspace.name}</p>
                                      <p className="text-sm text-gray-400">
                                        Created by: {getCreatorName(workspace.created_by)}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <select
                                    value={member.role || 'member'}
                                    onChange={(e) => updateMemberRole(member.id, e.target.value)}
                                    className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="member">Member</option>
                                    <option value="client">Client</option>
                                  </select>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center space-x-2 text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>{new Date(member.created_at).toLocaleDateString()}</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <button
                                    onClick={() => handleRemoveFromWorkspace(member)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition duration-300 flex items-center space-x-2 text-sm font-medium"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                    <span>Remove</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Statistics Tab */}
              {activeTab === 'stats' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-xl shadow-lg p-6"
                >
                  <h2 className="text-2xl font-bold mb-6">System Statistics</h2>
                  
                  <div className="space-y-6">
                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-300 text-sm">Total Users</p>
                            <p className="text-3xl font-bold">{users.length}</p>
                          </div>
                          <Users className="w-10 h-10 text-blue-400" />
                        </div>
                        <div className="mt-4 pt-3 border-t border-blue-700">
                          <p className="text-xs text-blue-300">
                            {users.filter(u => u.role === 'admin').length} admins
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-900 to-green-800 p-5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-300 text-sm">Active Workspaces</p>
                            <p className="text-3xl font-bold">{workspaces.length}</p>
                          </div>
                          <Building className="w-10 h-10 text-green-400" />
                        </div>
                        <div className="mt-4 pt-3 border-t border-green-700">
                          <p className="text-xs text-green-300">
                            Avg: {workspaces.length > 0 ? Math.round(workspaceMembers.length / workspaces.length) : 0} members/workspace
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-300 text-sm">Total Memberships</p>
                            <p className="text-3xl font-bold">{workspaceMembers.length}</p>
                          </div>
                          <UserCog className="w-10 h-10 text-purple-400" />
                        </div>
                        <div className="mt-4 pt-3 border-t border-purple-700">
                          <p className="text-xs text-purple-300">
                            Avg: {users.length > 0 ? Math.round(workspaceMembers.length / users.length) : 0} workspaces/user
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 p-5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-yellow-300 text-sm">Most Active</p>
                            <p className="text-3xl font-bold">
                              {workspaces.length > 0 
                                ? Math.max(...workspaces.map(ws => getWorkspaceMembersCount(ws.id)))
                                : 0}
                            </p>
                          </div>
                          <TrendingUp className="w-10 h-10 text-yellow-400" />
                        </div>
                        <div className="mt-4 pt-3 border-t border-yellow-700">
                          <p className="text-xs text-yellow-300">
                            Largest workspace member count
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Role Distribution */}
                    <div className="bg-gray-900 rounded-xl p-6">
                      <h3 className="text-xl font-bold mb-4">User Role Distribution</h3>
                      <div className="space-y-4">
                        {['admin', 'member', 'client'].map((role) => {
                          const count = users.filter(u => u.role === role).length;
                          const percentage = users.length > 0 ? (count / users.length) * 100 : 0;
                          
                          return (
                            <div key={role} className="space-y-2">
                              <div className="flex justify-between">
                                <div className="flex items-center space-x-3">
                                  {role === 'admin' && <Crown className="w-5 h-5 text-yellow-500" />}
                                  {role === 'member' && <UsersIcon className="w-5 h-5 text-blue-500" />}
                                  {role === 'client' && <Briefcase className="w-5 h-5 text-purple-500" />}
                                  <span className="capitalize font-medium">{role}s</span>
                                  <span className="text-gray-400">({count})</span>
                                </div>
                                <span className="font-bold">{percentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-800 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    role === 'admin' ? 'bg-yellow-500' :
                                    role === 'member' ? 'bg-blue-500' :
                                    'bg-purple-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-gray-900 rounded-xl p-6">
                        <h3 className="text-xl font-bold mb-4">Top Workspaces</h3>
                        <div className="space-y-3">
                          {workspaces
                            .sort((a, b) => getWorkspaceMembersCount(b.id) - getWorkspaceMembersCount(a.id))
                            .slice(0, 5)
                            .map((workspace, index) => (
                              <div key={workspace.id} className="flex items-center justify-between p-3 hover:bg-gray-800 rounded-lg transition duration-300">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium">{workspace.name}</p>
                                    <p className="text-sm text-gray-400">
                                      {getCreatorName(workspace.created_by)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">{getWorkspaceMembersCount(workspace.id)}</p>
                                  <p className="text-xs text-gray-400">members</p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      <div className="bg-gray-900 rounded-xl p-6">
                        <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium">New users this week</p>
                              <p className="text-sm text-gray-400">
                                {users.filter(user => {
                                  const createdDate = new Date(user.created_at);
                                  const oneWeekAgo = new Date();
                                  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                                  return createdDate > oneWeekAgo;
                                }).length} new users
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                              <Building className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium">Recent workspaces</p>
                              <p className="text-sm text-gray-400">
                                {workspaces.filter(ws => {
                                  const createdDate = new Date(ws.created_at);
                                  const oneWeekAgo = new Date();
                                  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                                  return createdDate > oneWeekAgo;
                                }).length} new this week
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium">System Status</p>
                              <p className="text-sm text-green-400">All systems operational</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
