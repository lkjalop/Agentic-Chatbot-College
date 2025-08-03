# EMERGENCY ROLLBACK INSTRUCTIONS

## 🚨 INSTANT ROLLBACK (If Something Breaks)

### **Method 1: Git Tag Rollback (FASTEST)**
```bash
# Rollback to stable version
git reset --hard stable-pre-optimization
git push origin main --force

# Vercel will auto-deploy the stable version
```

### **Method 2: Branch Rollback**
```bash
# Switch to backup branch
git checkout backup-pre-optimization
git checkout -b rollback-emergency
git push origin rollback-emergency

# Then deploy rollback-emergency branch on Vercel
```

### **Method 3: Selective Rollback (Per File)**
```bash
# Rollback specific files if only some features break
git checkout stable-pre-optimization -- app/components/ea-chat-assistant.tsx
git checkout stable-pre-optimization -- app/globals.css
git commit -m "Emergency rollback of specific files"
```

## 🔍 HEALTH CHECK COMMANDS

### **Quick System Test**
```bash
# Test build
npm run build

# Test locally
npm run dev

# Check for errors
npm run lint
npm run type-check
```

### **Critical Features Test Checklist**
- [ ] Landing page loads correctly
- [ ] Chat opens and responds
- [ ] Agent routing works (test "OPT application")
- [ ] Persona matching displays
- [ ] Under the Hood panel opens/closes
- [ ] Schedule button appears for booking agent
- [ ] Mobile UI works properly
- [ ] Voice recording functions

## 📞 ESCALATION PROTOCOL

If rollback fails or issues persist:
1. **Stop all optimization work immediately**
2. **Use Method 1 (Git Tag) for fastest recovery**
3. **Verify Vercel deployment shows stable version**
4. **Test all critical features**
5. **Document what broke for future reference**

## 💾 CURRENT STABLE STATE

**Branch**: `backup-pre-optimization`
**Tag**: `stable-pre-optimization`  
**Features Working**:
- 5-agent system with 91% routing accuracy
- Mobile UI fixes from Opus report
- Schedule button implementation
- Under the Hood diagnostics
- All mobile responsiveness fixes

**Performance Baseline**:
- Bundle size: ~800KB
- Load time: ~2.1s
- Message render: ~150ms
- All features functional

## 🎯 POST-ROLLBACK ACTIONS

1. **Verify system stability**
2. **Communicate status to stakeholders**
3. **Analyze what went wrong**
4. **Plan safer optimization approach**
5. **Document lessons learned**

---

**Remember: It's better to rollback quickly than to debug in production!**