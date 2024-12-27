import React, { useEffect, useState } from "react";
import { Box, Text } from "@radix-ui/themes";
import StatusBar from "./StatusBar";

const baseURL = "https://us-central1-serverless-project-gp3.cloudfunctions.net";

const AdminDashboard = ({
  embedUrl = "https://lookerstudio.google.com/embed/reporting/2dc34fbc-73a8-4100-8dd0-e880719fe6e7/page/peMXE",
}) => {
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function fetchUserId() {
      try {
        const response = await fetch(`${baseURL}/extracttoken`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${localStorage.getItem("accessToken")}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        if (responseData.statusCode === 200) {
          setUserId(responseData.userEmail);
        } else {
          console.error("Failed to fetch userId:", responseData.message);
        }
      } catch (error) {
        console.error("Error fetching userId:", error);
      }
    }

    fetchUserId();
  }, []);

  return (
    <>
      <StatusBar email={userId} />
      <Box
        className="flex flex-col justify-center items-center"
        style={{ backgroundColor: "#f0f4f8", minHeight: "100vh", paddingTop: "60px" }}
      >
        <Box
          className="w-full max-w-6xl bg-white p-6 rounded-lg shadow-lg"
          style={{ textAlign: "center", height: "calc(100vh - 60px)" }}
        >
          <Text size="4" weight="bold" className="mb-5">
            Admin Dashboard
          </Text>
          <br />
          <br />
          <iframe
            src={embedUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: "8px",
            }}
            allowFullScreen
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            title="Looker Studio Report"
          ></iframe>
        </Box>
      </Box>
    </>
  );
};

export default AdminDashboard;
