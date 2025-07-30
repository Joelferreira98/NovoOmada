import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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
}

export function Sidebar({ title, subtitle, icon: Icon, iconBg, items, extraContent }: SidebarProps) {
  const { logoutMutation } = useAuth();

  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className={`${iconBg} p-2 rounded-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">{title}</h2>
            <p className="text-slate-400 text-sm">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Extra Content */}
      {extraContent}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index}>
              <Button
                onClick={item.onClick}
                variant={item.active ? "secondary" : "ghost"}
                className={`w-full justify-start ${
                  item.active 
                    ? "bg-slate-700 text-white" 
                    : "text-slate-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700">
        <Button
          onClick={() => logoutMutation.mutate()}
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
}