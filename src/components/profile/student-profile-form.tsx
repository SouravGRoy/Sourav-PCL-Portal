"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function StudentProfileForm() {
  const { user } = useUserStore();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    usn: "",
    class: "",
    semester: "",
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
      usn: formData.usn.trim(),
      class: formData.class.trim(),
      semester: formData.semester.trim(),
    };

    // Validate name is non-empty
    if (!trimmedData.name) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log("Submitting profile:", { user_id: user.id, ...trimmedData });

      const { data, error } = await supabase
        .from("student_profiles")
        .insert([
          {
            user_id: user.id,
            name: trimmedData.name,
            usn: trimmedData.usn,
            class: trimmedData.class,
            semester: trimmedData.semester,
          },
        ])
        .select();

      if (error) throw error;

      console.log("Profile saved:", data);
      setSuccess(true);
      setError(null);

      // Redirect to dashboard after successful save
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error saving profile:", error.message);
      setError(error.message || "Failed to save profile");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Complete Your Student Profile</h2>
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">Profile saved successfully!</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">USN</label>
          <input
            type="text"
            value={formData.usn}
            onChange={(e) => setFormData({ ...formData, usn: e.target.value })}
            required
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Class
          </label>
          <input
            type="text"
            value={formData.class}
            onChange={(e) =>
              setFormData({ ...formData, class: e.target.value })
            }
            required
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Semester
          </label>
          <input
            type="text"
            value={formData.semester}
            onChange={(e) =>
              setFormData({ ...formData, semester: e.target.value })
            }
            required
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
