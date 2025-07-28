import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PrivacyManager } from '@/lib/privacy/privacy-manager';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { analyticsConsent, marketingConsent } = body;
    
    // Update user privacy settings
    await db.update(users)
      .set({
        analyticsConsent: analyticsConsent ?? undefined,
        marketingConsent: marketingConsent ?? undefined,
        updatedAt: new Date()
      })
      .where(eq(users.id, session.user.id));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    
    if (action === 'export') {
      // Export user data
      const userData = await PrivacyManager.exportUserData(session.user.id);
      
      if (!userData) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      
      return new Response(JSON.stringify(userData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="user-data-${session.user.id}.json"`
        }
      });
    }
    
    if (action === 'delete') {
      // Delete user data
      const success = await PrivacyManager.deleteUserData(session.user.id);
      
      if (!success) {
        return Response.json({ error: 'Failed to delete user data' }, { status: 500 });
      }
      
      return Response.json({ success: true, message: 'User data deleted successfully' });
    }
    
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling privacy request:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}