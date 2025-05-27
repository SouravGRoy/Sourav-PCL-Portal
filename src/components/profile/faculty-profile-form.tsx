"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function FacultyProfileForm() {
  const { user, setRole } = useUserStore();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    department: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("User not authenticated");
      router.push("/auth/login");
      return;
    }

    // Trim and validate form data
    const trimmedData = {
      name: formData.name.trim(),
      department: formData.department.trim(),
    };

    // Validate name is non-empty
    if (!trimmedData.name) {
      setError("Name is required");
      return;
    }

    // Validate department is non-empty
    if (!trimmedData.department) {
      setError("Department is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log("Submitting faculty profile:", { user_id: user.id, ...trimmedData });

      const { data, error } = await supabase
        .from("faculty_profiles")
        .insert([
          {
            user_id: user.id,
            name: trimmedData.name,
            department: trimmedData.department,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
        ])
        .select();

      if (error) throw error;

      console.log("Faculty profile saved:", data);
      setSuccess(true);
      setError(null);

      // Set role to faculty
      setRole("faculty");
      
      // Redirect to dashboard after successful save
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error saving faculty profile:", error.message);
      setError(error.message || "Failed to save profile");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Complete Your Faculty Profile</h2>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">Profile saved successfully!</p>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your full name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <input
            type="text"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            required
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your department"
          />
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
