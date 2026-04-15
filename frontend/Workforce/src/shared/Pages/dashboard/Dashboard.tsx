import EmployeeDashboard from "./EmployeeDashboard";
import AdminDashboard from "./AdminDashboard";
import { useAuth } from "../../../features/auth/hooks/useAuth";

const Dashboard = () => {
  
  const { userRole, isAuthenticated } = useAuth();

 
  if (isAuthenticated && !userRole) {
    return (
      <div className="flex items-center justify-center h-screen text-xl font-semibold">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen text-xl font-semibold">
        Unauthorized Access
      </div>
    );
  }

  const normalizedRole = userRole?.toLowerCase().trim();

  switch (normalizedRole) {
    case "admin":
      return <AdminDashboard />;
    case "employee":
      return <EmployeeDashboard />;
    default:
      return (
        <div className="flex items-center justify-center h-screen text-xl font-semibold">
          Role Not Supported
        </div>
      );
  }
};

export default Dashboard;