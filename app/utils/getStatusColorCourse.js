  export const getStatusColor = (status) => {
    switch (status) {
      case "Start Soon":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "In Progress":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      case "Partially Complete":
        return { bg: "#E0E7FF", text: "#4338CA" };
      case "Completed":
        return { bg: "#D1FAE5", text: "#065F46" };
      default:
        return { bg: "#F3F4F6", text: "#374151" };
    }
  };

  export const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };