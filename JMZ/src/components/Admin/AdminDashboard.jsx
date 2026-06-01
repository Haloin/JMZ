
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, DollarSign, Download, Activity, Search, Filter } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    total_downloads: 0,
    total_revenue: 0,
    active_downloads: 0,
    users_today: 0,
    downloads_today: 0,
    popular_sites: []
  });
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAdminStats();
    fetchUsers();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats.total_users, icon: Users, change: stats.users_today },
    { label: 'Total Downloads', value: stats.total_downloads, icon: Download, change: stats.downloads_today },
    { label: 'Revenue', value: `$${stats.total_revenue.toFixed(2)}`, icon: DollarSign },
    { label: 'Active Downloads', value: stats.active_downloads, icon: Activity },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage users and monitor platform activity</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="w-8 h-8 text-blue-400" />
                {stat.change && (
                  <span className="text-green-400 text-sm flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +{stat.change}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Popular Sites */}
        {stats.popular_sites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 bg-gray-800 rounded-lg p-6 border border-gray-700"
          >
            <h2 className="text-xl font-semibold mb-4">Popular Download Sites</h2>
            <div className="space-y-2">
              {stats.popular_sites.map(([site, count], index) => (
                <div key={site} className="flex justify-between items-center">
                  <span className="text-gray-300">{site}</span>
                  <span className="text-blue-400 font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Users Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-lg p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">User Management</h2>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="flex items-center space-x-2 bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-3 text-gray-400">Email</th>
                  <th className="pb-3 text-gray-400">Downloads</th>
                  <th className="pb-3 text-gray-400">Status</th>
                  <th className="pb-3 text-gray-400">Joined</th>
                  <th className="pb-3 text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(user => user.email.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-700 hover:bg-gray-700"
                    >
                      <td className="py-3">{user.email}</td>
                      <td className="py-3">{user.download_count}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.is_premium 
                            ? 'bg-green-900 text-green-300' 
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          {user.is_premium ? 'Premium' : 'Free'}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400">{user.created_at}</td>
                      <td className="py-3">
                        <button className="text-blue-400 hover:text-blue-300 mr-3">View</button>
                        <button className="text-red-400 hover:text-red-300">Suspend</button>
                      </td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
