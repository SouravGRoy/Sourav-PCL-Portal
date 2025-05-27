import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { updateStudentProfile, createStudentProfile } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import { StudentProfile } from '@/types';
import { useUserStore } from '@/lib/store';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  usn: z.string().min(1, 'USN is required'),
  class: z.string().min(1, 'Class is required'),
  semester: z.string().min(1, 'Semester is required'),
  group_usn: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UpdateProfileFormProps {
  profile: StudentProfile;
  onSuccess?: () => void;
}

export default function UpdateProfileForm({ profile, onSuccess }: UpdateProfileFormProps) {
  const router = useRouter();
  const { user, setName } = useUserStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name || '',
      usn: profile.usn || '',
      class: profile.class || '',
      semester: profile.semester || '',
      group_usn: profile.group_usn || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) {
      toast.error('You must be logged in to update your profile');
      return;
    }

    setIsSubmitting(true);
    try {
      // Skip updating the base profile name since the column doesn't exist
      // Just update the name in the global store
      setName(data.name);
      
      // Check if we need to create or update the student profile
      const { data: existingProfile, error: checkError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing student profile:', checkError);
        throw new Error(`Failed to check for existing profile: ${checkError.message}`);
      }
      
      try {
        if (!existingProfile) {
          // Create a new student profile
          const studentData = {
            id: user.id,
            usn: data.usn,
            class: data.class,
            semester: data.semester,
            group_usn: data.group_usn || '',
            subject_codes: [],
          };
          
          // Insert directly using supabase client to avoid API issues
          const { error: insertError } = await supabase
            .from('student_profiles')
            .insert({
              user_id: user.id,
              name: data.name, // Include name field to satisfy the not-null constraint
              usn: data.usn,
              class: data.class,
              semester: data.semester,
              group_usn: data.group_usn || '',
              subject_codes: []
            });
            
          if (insertError) {
            console.error('Error creating student profile:', insertError);
            throw new Error(`Failed to create student profile: ${insertError.message}`);
          }
        } else {
          // Update existing student profile
          const { error: updateError } = await supabase
            .from('student_profiles')
            .update({
              name: data.name, // Include name field to satisfy the not-null constraint
              usn: data.usn,
              class: data.class,
              semester: data.semester,
              group_usn: data.group_usn || ''
            })
            .eq('user_id', user.id);
            
          if (updateError) {
            console.error('Error updating student profile:', updateError);
            throw new Error(`Failed to update student profile: ${updateError.message}`);
          }
        }
        
        toast.success('Profile updated successfully');
        
        if (onSuccess) {
          onSuccess();
        }
      } catch (profileError: any) {
        console.error('Error with student profile:', profileError);
        toast.error(profileError.message || 'Failed to update student profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Update Your Profile</CardTitle>
        <CardDescription>
          Please complete your profile information to access all features
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="usn">USN Number</Label>
            <Input
              id="usn"
              placeholder="Enter your USN number"
              {...register('usn')}
            />
            {errors.usn && (
              <p className="text-sm text-red-500">{errors.usn.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="class">Class</Label>
            <Input
              id="class"
              placeholder="Enter your class"
              {...register('class')}
            />
            {errors.class && (
              <p className="text-sm text-red-500">{errors.class.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="semester">Semester</Label>
            <Input
              id="semester"
              placeholder="Enter your semester"
              {...register('semester')}
            />
            {errors.semester && (
              <p className="text-sm text-red-500">{errors.semester.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="group_usn">Group USN (optional)</Label>
            <Input
              id="group_usn"
              placeholder="Enter your group USN if known"
              {...register('group_usn')}
            />
            {errors.group_usn && (
              <p className="text-sm text-red-500">{errors.group_usn.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Profile'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
