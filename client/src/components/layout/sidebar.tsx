import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Offcanvas } from "react-bootstrap";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

interface SidebarProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconBg: string;
  items: SidebarItem[];
  extraContent?: React.ReactNode;
  className?: string;
}

export function Sidebar({ title, subtitle, icon: Icon, iconBg, items, extraContent, className }: SidebarProps) {
  const { logoutMutation } = useAuth();
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const SidebarContent = () => (
    <div className="bg-slate-800 text-white h-100 d-flex flex-column">
      {/* Header */}
      <div className="p-4 border-bottom border-secondary">
        <div className="d-flex align-items-center">
          <div className={`${iconBg} p-2 rounded me-3`}>
            <Icon className="text-white" size={24} />
          </div>
          <div>
            <h5 className="text-white mb-0 fw-semibold">{title}</h5>
            <small className="text-light opacity-75">{subtitle}</small>
          </div>
        </div>
      </div>

      {/* Extra Content */}
      {extraContent}

      {/* Navigation */}
      <nav className="flex-fill p-3">
        <div className="d-grid gap-2">
          {items.map((item, index) => (
            <Button
              key={index}
              onClick={() => {
                item.onClick();
                handleClose(); // Close sidebar on mobile after click
              }}
              variant={item.active ? "secondary" : "ghost"}
              className={`w-100 justify-content-start text-start ${
                item.active 
                  ? "bg-slate-700 text-white border-0" 
                  : "text-slate-300 hover:text-white hover:bg-slate-700 border-0"
              }`}
            >
              <item.icon className="me-3" size={18} />
              {item.label}
            </Button>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-top border-secondary mt-auto">
        <Button
          onClick={() => {
            logoutMutation.mutate();
            handleClose();
          }}
          variant="ghost"
          className="w-100 justify-content-start text-start text-slate-300 hover:text-white hover:bg-slate-700 border-0"
        >
          <LogOut className="me-3" size={18} />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button - Fixed Position */}
      <button
        className="btn btn-primary d-lg-none position-fixed top-0 start-0 m-3 z-3"
        onClick={handleShow}
        style={{ zIndex: 1050 }}
      >
        <Menu size={20} />
      </button>

      {/* Desktop Sidebar */}
      <div className="d-none d-lg-block bg-slate-800" style={{ width: '280px', minHeight: '100vh' }}>
        <SidebarContent />
      </div>

      {/* Mobile Offcanvas Sidebar */}
      <Offcanvas 
        show={show} 
        onHide={handleClose} 
        placement="start"
        className="d-lg-none"
        style={{ width: '280px' }}
      >
        <Offcanvas.Header className="bg-slate-800 text-white border-0">
          <Offcanvas.Title className="text-white">Menu</Offcanvas.Title>
          <button
            className="btn btn-sm btn-outline-light ms-auto"
            onClick={handleClose}
          >
            <X size={18} />
          </button>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <SidebarContent />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}