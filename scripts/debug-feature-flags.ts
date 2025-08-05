// Debug feature flags parsing

// Simulate production environment values (with \n)
process.env.FEATURE_CAREER_TRACKS = "true\n";
process.env.ROLLBACK_TO_ORIGINAL = "false\n";  
process.env.CAREER_TRACK_ROLLOUT = "100\n";

console.log('🔍 Debug Feature Flags Parsing');
console.log('=====================================');

console.log('Raw environment values:');
console.log(`FEATURE_CAREER_TRACKS: "${process.env.FEATURE_CAREER_TRACKS}"`);
console.log(`ROLLBACK_TO_ORIGINAL: "${process.env.ROLLBACK_TO_ORIGINAL}"`);
console.log(`CAREER_TRACK_ROLLOUT: "${process.env.CAREER_TRACK_ROLLOUT}"`);

console.log('\nParsed feature flags:');
const FEATURE_FLAGS = {
  USE_CAREER_TRACKS: process.env.FEATURE_CAREER_TRACKS !== 'false',
  ROLLBACK_TO_ORIGINAL: process.env.ROLLBACK_TO_ORIGINAL === 'true',
  CAREER_TRACK_ROLLOUT: parseInt(process.env.CAREER_TRACK_ROLLOUT || '100'),
};

console.log('USE_CAREER_TRACKS:', FEATURE_FLAGS.USE_CAREER_TRACKS);
console.log('ROLLBACK_TO_ORIGINAL:', FEATURE_FLAGS.ROLLBACK_TO_ORIGINAL);  
console.log('CAREER_TRACK_ROLLOUT:', FEATURE_FLAGS.CAREER_TRACK_ROLLOUT);

// Test shouldUseNewSystem logic
function shouldUseNewSystem(sessionId: string = 'anonymous'): boolean {
  if (FEATURE_FLAGS.ROLLBACK_TO_ORIGINAL) return false;
  if (!FEATURE_FLAGS.USE_CAREER_TRACKS) return false;
  
  const rolloutPercentage = FEATURE_FLAGS.CAREER_TRACK_ROLLOUT;
  if (rolloutPercentage >= 100) return true;
  if (rolloutPercentage <= 0) return false;
  
  // Consistent hash-based rollout
  const hash = sessionId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return Math.abs(hash) % 100 < rolloutPercentage;
}

console.log('\nshoudUseNewSystem() result:', shouldUseNewSystem());
console.log('Expected: true');

if (shouldUseNewSystem()) {
  console.log('\n✅ SUCCESS: New system should be active');
} else {
  console.log('\n❌ PROBLEM: System will use legacy routing');
}