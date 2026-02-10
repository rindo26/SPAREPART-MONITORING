# 🔐 LOGIN QUICK START

**Status:** ✅ Ready to Use  
**Version:** 3.2.1

---

## ⚡ 30-Second Setup

### 1. Start Server
```bash
python -m http.server 8000
```

### 2. Open App
```
http://localhost:8000
```

### 3. Login Screen Appears
Use any of these credentials:

| Username | Password |
|----------|----------|
| admin | 12345 |
| user | password |
| test | test123 |

### 4. Click "🔓 Masuk" or Press Ctrl+Enter
**✅ Done! You're logged in!**

---

## ✨ Key Features

✅ **Beautiful Login Screen**
- Red gradient design (matches app)
- Professional card layout
- Smooth animations

✅ **User Management**
- Multiple demo accounts
- Remember me checkbox
- Auto-fill username
- Current user shown in navbar

✅ **Logout**
- Click "🚪 Keluar" button
- Confirm logout
- Return to login screen

✅ **Session Timeout**
- Auto-logout after 30 min inactivity
- Tracks all user activity
- Shows warning before timeout

✅ **Security**
- Password validation
- Empty field checks
- Session management
- Clear data on logout

---

## 🎯 Try These

### Login & Explore
```
1. Login with admin / 12345
2. Go to Barcode Scanner
3. Run: simulateBarcodeScan('8901234567890')
4. Add to queue and submit
5. Check Inventory
```

### Logout
```
1. Click "🚪 Keluar" in navbar
2. Confirm logout
3. Return to login screen
4. Login again
```

### Remember Me
```
1. Check "Ingat saya" on login
2. Close browser completely
3. Reopen http://localhost:8000
4. See username auto-filled!
```

### Test Invalid Login
```
1. Username: admin
2. Password: wrong
3. See error message
4. Try again
```

---

## 📁 Files Added

```
✅ login.js              (200+ lines)  - Login logic
✅ LOGIN_DOCUMENTATION.md             - Full guide
```

**Modified:**
```
✅ index.HTML       - Added login screen
✅ style.css        - Added styling
```

---

## 🎨 Design Highlights

- **Color:** Red (#c8102e) gradient - matches app theme
- **Animation:** Smooth transitions and bouncing logo
- **Responsive:** Works on desktop, tablet, mobile
- **Icons:** User (👤) and lock (🔒) for visual clarity

---

## 🔄 Flow Diagram

```
User Opens App
    ↓
Check Session (sessionStorage)
    ↓
    [Already Logged In?]
    ├─ Yes → Show Main App
    └─ No  → Show Login Screen
        ↓
    [Credentials Valid?]
    ├─ Yes → Save Session → Show App
    └─ No  → Show Error → Stay on Login
```

---

## ⚙️ Configuration

### Change Credentials
Edit `login.js` line 8-12:
```javascript
const validUsers = {
    'admin': '12345',
    'newuser': 'newpass',  // Add this
};
```

### Change Session Timeout
Edit `login.js` line 189:
```javascript
const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes
```

### Disable Session Timeout
Edit `login.js`, comment out lines 188-200

---

## 🧪 Quick Test

Open browser console (F12) and run:

```javascript
// Check login status
console.log(currentLoggedInUser)

// Logout programmatically
handleLogout()

// Login programmatically
loginUser('admin')
```

---

## 🎓 What to Know

✅ Credentials are stored in JavaScript (demo only)  
⚠️ For production: Use backend validation  
✅ Passwords are NOT encrypted (demo only)  
⚠️ For production: Use HTTPS + hashed passwords  
✅ Sessions stored in sessionStorage (cleared on close)  
✅ Remember me uses localStorage (persists)  

---

## 🚀 Next Steps

1. **Test Login/Logout** - Try all demo accounts
2. **Test Remember Me** - Check "Ingat saya" then close browser
3. **Test Session Timeout** - Wait 30 minutes inactive
4. **Read Full Guide** - See LOGIN_DOCUMENTATION.md

---

## 💡 Tips

- Use **Ctrl+Enter** to quickly submit login form
- Login screen shows demo credentials for reference
- Check **"Ingat saya"** to auto-fill username next time
- Click **"🚪 Keluar"** in navbar to logout anytime
- Username displays in navbar after login

---

## ✅ Verification Checklist

- [ ] Login screen appears on first visit
- [ ] Can login with admin / 12345
- [ ] Username shown in navbar
- [ ] Main app accessible after login
- [ ] Can click barcode scanner and other menus
- [ ] Can logout with button
- [ ] Returns to login after logout
- [ ] Demo credentials shown on login screen
- [ ] Error message shows for invalid login
- [ ] "Ingat saya" auto-fills username

---

**Status:** ✅ Complete & Working  
**Date:** February 5, 2026  
**Version:** 3.2.1

**Start logging in! 🔐**
