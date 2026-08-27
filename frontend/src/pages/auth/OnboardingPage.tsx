import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, User, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';

export const OnboardingPage: React.FC = () => {
  const { profile, updateProfileState, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [academicYear, setAcademicYear] = useState<number>(profile?.academicYear || 1);
  const [gender, setGender] = useState<string>(profile?.gender || 'other');
  const [bio, setBio] = useState<string>(profile?.bio || '');
  const [fullName, setFullName] = useState<string>(profile?.fullName || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiClient.patch('/users/me/profile', {
        fullName: fullName.trim() || undefined,
        academicYear: Number(academicYear),
        gender,
        bio: bio.trim() || null,
      });

      updateProfileState(res.data.data);
      await refreshProfile();
      success('Profile Setup Complete', 'Your commuter profile has been updated.');
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        error('Profile Update Failed', err.message);
      } else {
        error('Update Failed', 'Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-panel border-indigo-500/30 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-400 flex items-center justify-center text-white mb-3 shadow-glow">
          <Sparkles className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-black text-white">Student Onboarding</CardTitle>
        <CardDescription>Personalize your traveler identity and campus preferences</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Preferred Display Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Academic Year"
              value={academicYear}
              onChange={(e) => setAcademicYear(Number(e.target.value))}
              options={[
                { value: 1, label: '1st Year (Freshman)' },
                { value: 2, label: '2nd Year (Sophomore)' },
                { value: 3, label: '3rd Year (Junior)' },
                { value: 4, label: '4th Year (Senior)' },
                { value: 5, label: 'Postgraduate / Masters' },
              ]}
            />

            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'non_binary', label: 'Non-Binary' },
                { value: 'other', label: 'Prefer not to say' },
              ]}
            />
          </div>

          <Textarea
            label="About You / Commuter Bio"
            placeholder="E.g. CS Sophomore at KIET. Daily commuter on the Ghaziabad-Noida route. Friendly, quiet, and loves good podcasts."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            helperText="Helps co-travelers and group hosts get to know you."
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-4"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Finish & Explore Campus Trips
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
