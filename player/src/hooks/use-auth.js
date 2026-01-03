"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"

const useAuth = (token) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  // console.log(token)
  const refetch = useCallback(async () => {
    if (!token) {
      setLoading(false)
      setIsAuthenticated(false)
      return
    }

    try {
      setLoading(true)
      const response = await axios.get("https://www.dikapi.olyox.in/api/auth/profile-details", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.data && response.data.
status ==="success") {
        setUser(response.data.data)
        setIsAuthenticated(true)
        setError(null)
      } else {
        throw new Error("Failed to fetch user data")
      }
    } catch (err) {
      console.error("Auth refetch error:", err)
      setError(err.message || "Authentication failed")
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { user, loading, error, isAuthenticated, refetch }
}

export default useAuth
