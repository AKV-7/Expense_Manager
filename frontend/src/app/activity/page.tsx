'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { Receipt, CreditCard } from 'lucide-react';

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (!getUser()) {
      router.push('/login');
    } else {
      fetchActivities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const fetchActivities = async () => {
    try {
      const { data } = await api.get('/activities');
      setActivities(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardContent className="p-6">
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, idx) => (
                  <div key={idx} className="border-l-4 border-primary pl-4 py-3 hover:bg-accent/50 rounded-r transition">
                    {activity.type === 'expense' ? (
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <Receipt className="h-5 w-5 text-red-500 mt-1" />
                          <div>
                            <p className="font-semibold">{activity.data.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {activity.data.creator.name} added expense in {activity.data.group.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.data.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-lg text-red-500">₹{activity.data.amount}</p>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <CreditCard className="h-5 w-5 text-green-500 mt-1" />
                          <div>
                            <p className="font-semibold">Payment recorded</p>
                            <p className="text-sm text-muted-foreground">
                              {activity.data.fromUser.name} paid {activity.data.toUser.name} in {activity.data.group.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.data.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-lg text-green-500">₹{activity.data.amount}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
