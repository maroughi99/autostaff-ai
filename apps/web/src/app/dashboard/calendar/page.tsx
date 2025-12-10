'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Phone, Mail, User } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureLocked } from "@/components/FeatureLocked";
import { API_URL } from '@/lib/utils';

interface Appointment {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  serviceType: string | null;
  appointmentDate: string;
  appointmentNotes: string | null;
  stage: string;
}

export default function CalendarPage() {
  const { user } = useUser();
  const { hasFeature, plan, loading: subscriptionLoading } = useSubscription();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_URL}/leads?userId=${user.id}`);
      if (response.ok) {
        const leads = await response.json();
        // Filter leads with appointments and sort by date
        const scheduled = leads
          .filter((lead: any) => lead.appointmentDate)
          .sort((a: any, b: any) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
        console.log('Scheduled appointments:', scheduled);
        setAppointments(scheduled);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  const getUpcomingAndPast = () => {
    const now = new Date();
    const upcoming = appointments.filter(apt => new Date(apt.appointmentDate) >= now);
    const past = appointments.filter(apt => new Date(apt.appointmentDate) < now);
    return { upcoming, past };
  };

  const { upcoming, past } = getUpcomingAndPast();

  if (loading || subscriptionLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  // Check if user has access to calendar management feature
  if (!hasFeature('calendar_management')) {
    return (
      <FeatureLocked
        feature="Calendar & Appointment Management"
        requiredPlan="Starter"
        description="Schedule and manage site visits, appointments, and calendar bookings with your clients."
      />
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Calendar & Bookings</h1>
        </div>
        <p className="text-gray-600">
          View all scheduled site visits and appointments
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading appointments...</p>
        </div>
      ) : (
        <>
          {/* Upcoming Appointments */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Clock className="h-6 w-6 text-green-600" />
              Upcoming ({upcoming.length})
            </h2>
            
            {upcoming.length === 0 ? (
              <Card className="p-8 text-center border-2 border-dashed">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No upcoming appointments</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {upcoming.map((apt) => {
                  const { date, time } = formatDateTime(apt.appointmentDate);
                  return (
                    <Card key={apt.id} className="p-6 border-2 border-green-200 bg-gradient-to-r from-white to-green-50 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                              {apt.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold">{apt.name}</h3>
                              <p className="text-sm text-gray-600">{apt.serviceType || 'Service requested'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-13">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Calendar className="h-4 w-4 text-green-600" />
                              <span className="font-semibold">{date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <Clock className="h-4 w-4 text-green-600" />
                              <span className="font-semibold">{time}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span>{apt.address || 'No address provided'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="h-4 w-4" />
                              <span>{apt.phone || 'No phone provided'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 col-span-2">
                              <Mail className="h-4 w-4" />
                              <span>{apt.email}</span>
                            </div>
                          </div>

                          {apt.appointmentNotes && (
                            <div className="mt-3 p-3 bg-white rounded-lg border ml-13">
                              <p className="text-sm text-gray-600">{apt.appointmentNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Appointments */}
          {past.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-500">
                <Calendar className="h-6 w-6" />
                Past ({past.length})
              </h2>
              
              <div className="grid gap-4">
                {past.map((apt) => {
                  const { date, time } = formatDateTime(apt.appointmentDate);
                  return (
                    <Card key={apt.id} className="p-6 border-2 bg-gray-50 opacity-75">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-gray-400 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                              {apt.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-700">{apt.name}</h3>
                              <p className="text-sm text-gray-500">{apt.serviceType || 'Service requested'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-13">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>{date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>{time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
