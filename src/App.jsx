import React, { useState, useEffect, useCallback } from "react";
import ChatUI from "./components/ChatUI.jsx";
import UserForm from "./components/UserForm.jsx";
import logger from "./logger";

const App = () => {
  const [formVisible, setFormVisible] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [isLoading, setIsLoading] = useState(true);

  const handleFormSubmit = useCallback((data) => {
    logger.info("Form submitted:", data);
    setFormData(data);
    setFormVisible(false);
    localStorage.setItem("userData", JSON.stringify(data));
  }, []);

  const handleLogout = () => {
    // Add a smooth transition effect
    document.querySelector(".content").style.opacity = "0";
    setTimeout(() => {
      setFormData({ name: "", email: "" });
      setFormVisible(true);
      localStorage.removeItem("userData");
      document.querySelector(".content").style.opacity = "1";
    }, 300);
  };

  useEffect(() => {
    const storedData = localStorage.getItem("userData");
    if (storedData) {
      setFormData(JSON.parse(storedData));
      setFormVisible(false);
    }
    // Simulate loading (you can remove this if not needed)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading your chat experience...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="bg-white rounded-2xl shadow-lg p-6 mb-6 backdrop-blur-sm bg-opacity-90 border border-white">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Chat Assistant
              </h1>
              <p className="text-gray-600 mt-2">
                Engage with our intelligent AI-powered chatbot
              </p>
            </div>

            {formData.name && formData.email && (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm text-gray-500">Logged in as</span>
                  <span className="font-medium text-purple-700">
                    {formData.name}
                  </span>
                </div>
                <button
                  className="flex items-center gap-2 bg-white text-red-500 border border-red-200 px-4 py-2 rounded-xl font-medium hover:bg-red-50 active:bg-red-100 transition-all duration-200 shadow-sm"
                  onClick={handleLogout}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="content transition-opacity duration-300">
          {!formData.name && formVisible ? (
            <UserForm onSubmit={handleFormSubmit} />
          ) : (
            <ChatUI formData={formData} />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Powered by DeepSeek-R1 AI Technology • Your conversations are secure
            and private
          </p>
        </footer>
      </div>
    </main>
  );
};

export default App;
