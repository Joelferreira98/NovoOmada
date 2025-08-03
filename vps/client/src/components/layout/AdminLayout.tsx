import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { 
  MdDashboard, 
  MdPeople, 
  MdSettings, 
  MdLogout, 
  MdMenu, 
  MdClose,
  MdReport,
  MdShoppingCart,
  MdWifi,
  MdPrint,
  MdAccountCircle,
  MdBugReport
} from 'react-icons/md';
import { FaUserCog, FaStore } from 'react-icons/fa';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = {
    master: [
      { path: '/', icon: <MdDashboard />, label: 'Dashboard' },
      { path: '/diagnostics', icon: <MdBugReport />, label: 'Diagnóstico' },
      { path: '/reports', icon: <MdReport />, label: 'Relatórios' },
      { path: '/profile', icon: <MdAccountCircle />, label: 'Perfil' },
    ],
    admin: [
      { path: '/admin', icon: <MdDashboard />, label: 'Dashboard' },
      { path: '/reports', icon: <MdReport />, label: 'Relatórios' },
      { path: '/cash', icon: <MdShoppingCart />, label: 'Caixa' },
      { path: '/profile', icon: <MdAccountCircle />, label: 'Perfil' },
    ],
    vendedor: [
      { path: '/vendedor', icon: <FaStore />, label: 'Vendas' },
      { path: '/reports', icon: <MdReport />, label: 'Relatórios' },
      { path: '/profile', icon: <MdAccountCircle />, label: 'Perfil' },
    ]
  };

  const currentMenuItems = user ? menuItems[user.role as keyof typeof menuItems] || [] : [];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-base-100 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:static lg:w-64`}>
        
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-base-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MdWifi className="text-white text-lg" />
            </div>
            <span className="font-bold text-lg text-base-content">Omada Voucher</span>
          </div>
          <button 
            onClick={toggleSidebar}
            className="lg:hidden btn btn-ghost btn-sm"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-base-200">
          <div className="flex items-center space-x-3">
            <div className="avatar">
              <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                <span className="font-semibold">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div>
              <p className="font-semibold text-base-content">{user?.username}</p>
              <p className="text-sm text-base-content/70 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {currentMenuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location === item.path
                  ? 'bg-primary text-primary-content'
                  : 'text-base-content hover:bg-base-200'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-base-200">
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-error hover:bg-error/10 transition-colors"
          >
            <MdLogout className="text-xl" />
            <span className="font-medium">
              {logoutMutation.isPending ? 'Saindo...' : 'Sair'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Navigation Bar */}
        <header className="bg-base-100 shadow-sm border-b border-base-200">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={toggleSidebar}
              className="lg:hidden btn btn-ghost btn-sm"
            >
              <MdMenu className="text-xl" />
            </button>
            
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-base-content">
                {currentMenuItems.find(item => item.path === location)?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle - pode ser implementado futuramente */}
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                  <div className="w-8 rounded-full bg-primary text-primary-content flex items-center justify-center">
                    <span className="font-semibold text-sm">{user?.username?.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
                <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                  <li><a onClick={() => navigate('/profile')}>Perfil</a></li>
                  <li><a onClick={handleLogout}>Sair</a></li>
                </ul>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;