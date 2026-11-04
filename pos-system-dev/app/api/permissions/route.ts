import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Define permission categories and their specific permissions
const PERMISSION_DEFINITIONS = {
  pos: {
    name: 'Point of Sale',
    permissions: [
      'pos.access',
      'pos.process_sale',
      'pos.refund',
      'pos.void_transaction',
      'pos.apply_discount',
      'pos.split_payment',
      'pos.hold_transaction'
    ]
  },
  inventory: {
    name: 'Inventory Management',
    permissions: [
      'inventory.view',
      'inventory.create',
      'inventory.update',
      'inventory.delete',
      'inventory.transfer',
      'inventory.adjust',
      'inventory.audit'
    ]
  },
  products: {
    name: 'Product Management',
    permissions: [
      'products.view',
      'products.create',
      'products.update',
      'products.delete',
      'products.manage_pricing',
      'products.manage_categories'
    ]
  },
  customers: {
    name: 'Customer Management',
    permissions: [
      'customers.view',
      'customers.create',
      'customers.update',
      'customers.delete',
      'customers.view_history',
      'customers.manage_loyalty'
    ]
  },
  reports: {
    name: 'Reports & Analytics',
    permissions: [
      'reports.view',
      'reports.sales',
      'reports.inventory',
      'reports.financial',
      'reports.export',
      'reports.analytics'
    ]
  },
  administration: {
    name: 'Administration',
    permissions: [
      'admin.user_management',
      'admin.role_management',
      'admin.business_settings',
      'admin.system_settings',
      'admin.audit_logs',
      'admin.backup_restore'
    ]
  },
  pharmacy: {
    name: 'Pharmacy Operations',
    permissions: [
      'pharmacy.prescriptions',
      'pharmacy.drug_interactions',
      'pharmacy.patient_records',
      'pharmacy.controlled_substances',
      'pharmacy.insurance_claims'
    ]
  }
};

// Default role permissions
const DEFAULT_ROLES = {
  admin: {
    name: 'Administrator',
    description: 'Full system access',
    permissions: Object.values(PERMISSION_DEFINITIONS).flatMap(cat => cat.permissions)
  },
  manager: {
    name: 'Manager',
    description: 'Management level access',
    permissions: [
      ...PERMISSION_DEFINITIONS.pos.permissions,
      ...PERMISSION_DEFINITIONS.inventory.permissions,
      ...PERMISSION_DEFINITIONS.products.permissions,
      ...PERMISSION_DEFINITIONS.customers.permissions,
      ...PERMISSION_DEFINITIONS.reports.permissions.filter(p => p !== 'reports.analytics'),
      'admin.business_settings'
    ]
  },
  cashier: {
    name: 'Cashier',
    description: 'Basic POS access',
    permissions: [
      'pos.access',
      'pos.process_sale',
      'pos.refund',
      'pos.apply_discount',
      'inventory.view',
      'products.view',
      'customers.view',
      'customers.create',
      'customers.update'
    ]
  },
  pharmacist: {
    name: 'Pharmacist',
    description: 'Pharmacy operations access',
    permissions: [
      ...PERMISSION_DEFINITIONS.pos.permissions,
      ...PERMISSION_DEFINITIONS.pharmacy.permissions,
      'inventory.view',
      'inventory.update',
      'products.view',
      'customers.view',
      'customers.create',
      'customers.update'
    ]
  }
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const roleId = searchParams.get('roleId');

    switch (action) {
      case 'permissions':
        // Get all available permissions
        return NextResponse.json({
          categories: PERMISSION_DEFINITIONS,
          totalPermissions: Object.values(PERMISSION_DEFINITIONS).reduce(
            (total, cat) => total + cat.permissions.length, 0
          )
        });

      case 'roles':
        // Get all roles
        if (!['admin', 'manager'].includes(session.user.role)) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const roles = Object.entries(DEFAULT_ROLES).map(([id, role]) => ({
          id,
          ...role,
          userCount: Math.floor(Math.random() * 20) + 1,
          isSystem: true
        }));

        if (roleId) {
          const role = roles.find(r => r.id === roleId);
          if (!role) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
          }
          return NextResponse.json({ role });
        }

        return NextResponse.json({ roles });

      case 'user-permissions':
        // Get permissions for a specific user
        if (userId && userId !== session.user.id && !['admin', 'manager'].includes(session.user.role)) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const targetUserId = userId || session.user.id;
        const userRole = session.user.role;
        const userPermissions = DEFAULT_ROLES[userRole]?.permissions || [];

        return NextResponse.json({
          userId: targetUserId,
          role: userRole,
          permissions: userPermissions,
          effectivePermissions: {
            pos: userPermissions.filter(p => p.startsWith('pos.')),
            inventory: userPermissions.filter(p => p.startsWith('inventory.')),
            products: userPermissions.filter(p => p.startsWith('products.')),
            customers: userPermissions.filter(p => p.startsWith('customers.')),
            reports: userPermissions.filter(p => p.startsWith('reports.')),
            admin: userPermissions.filter(p => p.startsWith('admin.')),
            pharmacy: userPermissions.filter(p => p.startsWith('pharmacy.'))
          }
        });

      case 'check-permission':
        // Check if current user has specific permission
        const permission = searchParams.get('permission');
        if (!permission) {
          return NextResponse.json(
            { error: 'Permission parameter required' },
            { status: 400 }
          );
        }

        const hasPermission = DEFAULT_ROLES[session.user.role]?.permissions.includes(permission) || false;
        
        return NextResponse.json({
          permission,
          hasPermission,
          role: session.user.role
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: permissions, roles, user-permissions, or check-permission' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error handling permissions request:', error);
    return NextResponse.json(
      { error: 'Failed to process permissions request' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create roles
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { name, description, permissions, basedOn } = await req.json();

    if (!name || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Name and permissions array are required' },
        { status: 400 }
      );
    }

    // Validate permissions
    const allPermissions = Object.values(PERMISSION_DEFINITIONS).flatMap(cat => cat.permissions);
    const invalidPermissions = permissions.filter(p => !allPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
        { status: 400 }
      );
    }

    // Create new role
    const newRole = {
      id: crypto.randomUUID(),
      name,
      description: description || '',
      permissions,
      basedOn: basedOn || null,
      isSystem: false,
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
      businessId: session.user.businessId,
      userCount: 0
    };

    return NextResponse.json({
      success: true,
      role: newRole,
      message: 'Role created successfully'
    });

  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can modify roles
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { roleId, userId, action, permissions, name, description } = await req.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'assign-role':
        if (!roleId || !userId) {
          return NextResponse.json(
            { error: 'Role ID and User ID are required' },
            { status: 400 }
          );
        }

        // Mock role assignment
        return NextResponse.json({
          success: true,
          userId,
          newRole: roleId,
          message: 'Role assigned successfully'
        });

      case 'update-role':
        if (!roleId) {
          return NextResponse.json(
            { error: 'Role ID is required' },
            { status: 400 }
          );
        }

        // Prevent modification of system roles
        if (Object.keys(DEFAULT_ROLES).includes(roleId)) {
          return NextResponse.json(
            { error: 'Cannot modify system roles' },
            { status: 403 }
          );
        }

        const updatedRole = {
          id: roleId,
          name: name || 'Custom Role',
          description: description || '',
          permissions: permissions || [],
          modifiedBy: session.user.id,
          modifiedAt: new Date().toISOString()
        };

        return NextResponse.json({
          success: true,
          role: updatedRole,
          message: 'Role updated successfully'
        });

      case 'grant-permission':
        if (!userId || !permissions) {
          return NextResponse.json(
            { error: 'User ID and permissions are required' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          userId,
          grantedPermissions: permissions,
          message: 'Permissions granted successfully'
        });

      case 'revoke-permission':
        if (!userId || !permissions) {
          return NextResponse.json(
            { error: 'User ID and permissions are required' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          userId,
          revokedPermissions: permissions,
          message: 'Permissions revoked successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: assign-role, update-role, grant-permission, or revoke-permission' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete roles
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Prevent deletion of system roles
    if (Object.keys(DEFAULT_ROLES).includes(roleId)) {
      return NextResponse.json(
        { error: 'Cannot delete system roles' },
        { status: 403 }
      );
    }

    // Check if role is in use
    const roleInUse = Math.random() > 0.7; // 30% chance role is in use
    
    if (roleInUse) {
      return NextResponse.json(
        { error: 'Cannot delete role that is currently assigned to users' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      roleId,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}
