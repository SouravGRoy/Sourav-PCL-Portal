"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Student } from "@/types";

interface StudentSearchProps {
  searchResults: Student[];
  isLoading: boolean;
  onSearch: (searchTerm: string) => void;
  onAddStudent: (studentId: string) => void;
}

export default function StudentSearch({ searchResults, isLoading, onSearch, onAddStudent }: StudentSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e?: React.FormEvent) => {
    // Prevent form submission which causes page refresh
    if (e) e.preventDefault();
    
    // Only search if there's a term
    if (searchTerm.trim()) {
      onSearch(searchTerm);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="font-medium">Add Students to Group</h4>
        <p className="text-sm text-muted-foreground">Search by USN or email to find students</p>
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <Input
            placeholder="Search by USN or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search students"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </form>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Search Results</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>USN</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchResults.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.usn}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => onAddStudent(student.id)}
                      disabled={isLoading}
                    >
                      Add
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
