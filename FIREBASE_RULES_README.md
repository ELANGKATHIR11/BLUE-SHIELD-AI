# 🔥 Firebase Firestore Security Rules

## Overview
This document contains the security rules for your maritime safety application's Firebase Firestore database.

## 📁 Files
- `firestore.rules` - Basic rules for immediate deployment
- `firestore.rules.advanced` - Advanced rules with authentication (future use)

## 🚀 How to Deploy Rules

### Option 1: Firebase Console (Recommended for beginners)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `blue-shield-live-101`
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` and paste them
5. Click **Publish**

### Option 2: Firebase CLI (For developers)
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

## 📋 Rule Categories

### 🔐 Basic Rules (`firestore.rules`)
- **Users Collection**: Store fisherman registration details
- **Vessels Collection**: Store real-time vessel tracking data
- **Alerts Collection**: Store safety alerts and notifications
- **Messages Collection**: Store Coast Guard communications

### 🛡️ Advanced Rules (`firestore.rules.advanced`)
- **Authentication-based access control**
- **Role-based permissions** (Coast Guard vs Fisherman)
- **Owner-based data access**
- **Emergency contacts protection**
- **Vessel logs and zone violations**

## 🔒 Security Features

### Basic Rules
- ✅ **Read Access**: Open for monitoring
- ✅ **Create Access**: Open for registration
- ✅ **Update Access**: Open for real-time updates
- ❌ **Delete Access**: Blocked for data safety

### Advanced Rules (Future)
- 🔐 **Authentication Required**: Users must be logged in
- 👥 **Role-based Access**: Different permissions for different roles
- 🚢 **Vessel Owner Access**: Fishermen can only access their own data
- 🛡️ **Coast Guard Privileges**: Full access for monitoring
- 📝 **Audit Trail**: All actions are logged

## 📊 Collections Structure

```
firestore/
├── users/
│   └── {aisId}/
│       ├── aisId: string
│       ├── boatId: string
│       ├── fishermanName: string
│       ├── contactInfo: string
│       ├── createdAt: timestamp
│       ├── lastUpdated: timestamp
│       ├── status: 'active' | 'inactive'
│       └── location: {lat, lng, timestamp}
├── vessels/
│   └── {aisId}/
│       ├── aisId: string
│       ├── boatId: string
│       ├── location: {lat, lng, timestamp}
│       ├── status: 'safe' | 'warning' | 'danger'
│       ├── speed: number
│       ├── heading: number
│       ├── lastUpdate: timestamp
│       ├── fishermanName: string
│       └── contactInfo: string
├── alerts/
│   └── {alertId}/
│       ├── id: string
│       ├── type: 'warning' | 'danger' | 'info'
│       ├── message: string
│       ├── timestamp: timestamp
│       ├── zone: string
│       └── targetBoat: string
└── messages/
    └── {messageId}/
        ├── id: string
        ├── targetBoat: string
        ├── message: string
        ├── timestamp: timestamp
        ├── priority: 'low' | 'medium' | 'high'
        └── status: 'sent' | 'delivered' | 'acknowledged'
```

## ⚠️ Important Notes

1. **Start with Basic Rules**: Deploy `firestore.rules` first
2. **Test Thoroughly**: Ensure all functionality works with rules
3. **Monitor Usage**: Check Firebase Console for any denied requests
4. **Gradual Migration**: Move to advanced rules when authentication is implemented

## 🔧 Troubleshooting

### Common Issues
- **Permission Denied**: Check if rules match your data access patterns
- **Read Errors**: Ensure collection names match exactly
- **Write Errors**: Verify create/update permissions

### Testing Rules
```javascript
// Test in Firebase Console Rules Playground
// Example test cases:
// 1. Read vessel data as Coast Guard
// 2. Update location as vessel owner
// 3. Create new alert as Coast Guard
// 4. Read alerts as vessel owner
```

## 📞 Support
If you encounter issues with the rules:
1. Check Firebase Console for error logs
2. Test rules in the Rules Playground
3. Verify collection names and document structure
4. Ensure your app's data access patterns match the rules

---

**Current Status**: Ready for deployment with basic rules
**Next Step**: Deploy `firestore.rules` to your Firebase project
