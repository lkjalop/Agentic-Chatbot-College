import { NextRequest, NextResponse } from 'next/server';
import { batchUpsertVectors } from '@/lib/vector';
import { db } from '@/lib/db';
import { syntheticDataMeta } from '@/lib/db/schema';

const syntheticData = [
  {
    id: 'html-basics',
    title: 'HTML Basics',
    content: 'HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure of a web page using markup elements like tags, attributes, and content.',
    category: 'Web Development',
    contentType: 'concept' as const,
    difficulty: 'beginner' as const,
    prerequisites: [],
    leadsTo: ['css-basics', 'javascript-basics'],
    relatedConcepts: ['web-browsers', 'markup-languages'],
    careerPaths: ['frontend-developer', 'web-developer'],
    tags: ['html', 'web', 'markup', 'frontend']
  },
  {
    id: 'css-basics',
    title: 'CSS Basics',
    content: 'CSS (Cascading Style Sheets) is used to style and layout web pages. It controls the visual presentation of HTML elements including colors, fonts, spacing, and positioning.',
    category: 'Web Development',
    contentType: 'concept' as const,
    difficulty: 'beginner' as const,
    prerequisites: ['html-basics'],
    leadsTo: ['responsive-design', 'css-frameworks'],
    relatedConcepts: ['selectors', 'box-model', 'flexbox'],
    careerPaths: ['frontend-developer', 'web-developer', 'ui-designer'],
    tags: ['css', 'styling', 'web', 'frontend']
  },
  {
    id: 'javascript-basics',
    title: 'JavaScript Basics',
    content: 'JavaScript is a programming language that enables interactive web pages. It is an essential part of web applications alongside HTML and CSS.',
    category: 'Programming',
    contentType: 'concept' as const,
    difficulty: 'beginner' as const,
    prerequisites: ['html-basics'],
    leadsTo: ['react-basics', 'nodejs-basics', 'es6-features'],
    relatedConcepts: ['variables', 'functions', 'dom-manipulation'],
    careerPaths: ['frontend-developer', 'fullstack-developer', 'web-developer'],
    tags: ['javascript', 'programming', 'web', 'frontend']
  },
  {
    id: 'react-basics',
    title: 'React Basics',
    content: 'React is a JavaScript library for building user interfaces. It allows developers to create reusable UI components and manage application state efficiently.',
    category: 'Web Development',
    contentType: 'skill' as const,
    difficulty: 'intermediate' as const,
    prerequisites: ['javascript-basics', 'html-basics', 'css-basics'],
    leadsTo: ['react-hooks', 'state-management', 'nextjs-basics'],
    relatedConcepts: ['components', 'jsx', 'virtual-dom'],
    careerPaths: ['frontend-developer', 'react-developer'],
    tags: ['react', 'javascript', 'frontend', 'library']
  },
  {
    id: 'python-basics',
    title: 'Python Basics',
    content: 'Python is a high-level, interpreted programming language known for its simplicity and readability. It is widely used in web development, data science, and automation.',
    category: 'Programming',
    contentType: 'concept' as const,
    difficulty: 'beginner' as const,
    prerequisites: [],
    leadsTo: ['data-structures-python', 'web-frameworks-python', 'data-science-python'],
    relatedConcepts: ['syntax', 'data-types', 'control-flow'],
    careerPaths: ['python-developer', 'data-scientist', 'backend-developer'],
    tags: ['python', 'programming', 'beginner-friendly']
  },
  {
    id: 'data-science-python',
    title: 'Data Science with Python',
    content: 'Data science using Python involves analyzing and interpreting complex data using libraries like pandas, numpy, and scikit-learn to extract insights and build predictive models.',
    category: 'Data Science',
    contentType: 'skill' as const,
    difficulty: 'intermediate' as const,
    prerequisites: ['python-basics', 'statistics-basics', 'mathematics-basics'],
    leadsTo: ['machine-learning', 'deep-learning', 'data-visualization'],
    relatedConcepts: ['pandas', 'numpy', 'matplotlib', 'jupyter'],
    careerPaths: ['data-scientist', 'data-analyst', 'ml-engineer'],
    tags: ['data-science', 'python', 'analytics', 'statistics']
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning Fundamentals',
    content: 'Machine Learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed.',
    category: 'Artificial Intelligence',
    contentType: 'concept' as const,
    difficulty: 'advanced' as const,
    prerequisites: ['data-science-python', 'statistics-basics', 'linear-algebra'],
    leadsTo: ['deep-learning', 'nlp', 'computer-vision'],
    relatedConcepts: ['supervised-learning', 'unsupervised-learning', 'algorithms'],
    careerPaths: ['ml-engineer', 'data-scientist', 'ai-researcher'],
    tags: ['machine-learning', 'ai', 'algorithms', 'models']
  },
  {
    id: 'frontend-developer',
    title: 'Frontend Developer Career Path',
    content: 'Frontend developers create user interfaces and user experiences for web applications. They work with HTML, CSS, JavaScript, and modern frameworks to build interactive websites.',
    category: 'Career Paths',
    contentType: 'career' as const,
    difficulty: 'intermediate' as const,
    prerequisites: ['html-basics', 'css-basics', 'javascript-basics'],
    leadsTo: ['senior-frontend-developer', 'fullstack-developer', 'ui-ux-designer'],
    relatedConcepts: ['responsive-design', 'performance-optimization', 'accessibility'],
    careerPaths: [],
    tags: ['career', 'frontend', 'web-development', 'ui']
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist Career Path',
    content: 'Data scientists analyze complex data to help organizations make informed decisions. They combine programming, statistics, and domain expertise to extract insights from data.',
    category: 'Career Paths',
    contentType: 'career' as const,
    difficulty: 'advanced' as const,
    prerequisites: ['python-basics', 'statistics-basics', 'data-science-python'],
    leadsTo: ['senior-data-scientist', 'ml-engineer', 'data-science-manager'],
    relatedConcepts: ['statistical-analysis', 'data-visualization', 'business-intelligence'],
    careerPaths: [],
    tags: ['career', 'data-science', 'analytics', 'python']
  },
  {
    id: 'statistics-basics',
    title: 'Statistics Fundamentals',
    content: 'Statistics is the study of data collection, analysis, interpretation, and presentation. It provides tools for understanding patterns and making predictions from data.',
    category: 'Mathematics',
    contentType: 'concept' as const,
    difficulty: 'beginner' as const,
    prerequisites: ['mathematics-basics'],
    leadsTo: ['data-science-python', 'machine-learning', 'research-methods'],
    relatedConcepts: ['probability', 'hypothesis-testing', 'regression'],
    careerPaths: ['data-scientist', 'data-analyst', 'researcher'],
    tags: ['statistics', 'mathematics', 'data-analysis']
  },
  {
    id: 'nodejs-basics',
    title: 'Node.js Basics',
    content: 'Node.js is a JavaScript runtime that allows developers to run JavaScript on the server side. It enables building scalable backend applications and APIs.',
    category: 'Backend Development',
    contentType: 'skill' as const,
    difficulty: 'intermediate' as const,
    prerequisites: ['javascript-basics'],
    leadsTo: ['express-framework', 'database-integration', 'api-development'],
    relatedConcepts: ['npm', 'modules', 'async-programming'],
    careerPaths: ['backend-developer', 'fullstack-developer'],
    tags: ['nodejs', 'javascript', 'backend', 'server']
  },
  {
    id: 'database-basics',
    title: 'Database Fundamentals',
    content: 'Databases are organized collections of data that can be easily accessed, managed, and updated. Understanding databases is crucial for backend development and data management.',
    category: 'Backend Development',
    contentType: 'concept' as const,
    difficulty: 'beginner' as const,
    prerequisites: [],
    leadsTo: ['sql-basics', 'nosql-databases', 'database-design'],
    relatedConcepts: ['tables', 'relationships', 'queries'],
    careerPaths: ['backend-developer', 'database-administrator', 'data-engineer'],
    tags: ['database', 'data', 'storage', 'backend']
  },
  {
    id: 'version-control-git',
    title: 'Version Control with Git',
    content: 'Git is a distributed version control system that tracks changes in source code during software development. It enables collaboration and maintains a history of code changes.',
    category: 'Development Tools',
    contentType: 'skill' as const,
    difficulty: 'beginner' as const,
    prerequisites: [],
    leadsTo: ['github-collaboration', 'branching-strategies', 'ci-cd-basics'],
    relatedConcepts: ['repositories', 'commits', 'branches', 'merging'],
    careerPaths: ['software-developer', 'devops-engineer'],
    tags: ['git', 'version-control', 'collaboration', 'development']
  }
];

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting synthetic data generation...');
    
    // Prepare vector data
    const vectorData = syntheticData.map(item => ({
      id: item.id,
      content: `${item.title}. ${item.content}`,
      metadata: {
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        contentType: item.contentType,
        difficulty: item.difficulty,
        prerequisites: item.prerequisites,
        leadsTo: item.leadsTo,
        relatedConcepts: item.relatedConcepts,
        careerPaths: item.careerPaths,
        tags: item.tags,
        confidenceScore: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }));

    // Upsert to vector database
    console.log(`📊 Upserting ${vectorData.length} vectors to Upstash...`);
    const vectorResult = await batchUpsertVectors(vectorData);
    
    if (!vectorResult.success) {
      throw new Error(`Vector upsert failed: ${vectorResult.error}`);
    }

    // Save metadata to PostgreSQL
    console.log('💾 Saving metadata to PostgreSQL...');
    const metadataRecords = syntheticData.map(item => ({
      vectorId: item.id,
      title: item.title,
      category: item.category,
      contentType: item.contentType,
      difficulty: item.difficulty,
      prerequisites: item.prerequisites,
      leadsTo: item.leadsTo,
      relatedConcepts: item.relatedConcepts,
      careerPaths: item.careerPaths,
      tags: item.tags,
      confidenceScore: 1.0,
      usageCount: 0
    }));

    // Insert metadata records with conflict resolution
    await db.insert(syntheticDataMeta).values(metadataRecords).onConflictDoUpdate({
      target: syntheticDataMeta.vectorId,
      set: {
        title: syntheticDataMeta.title,
        category: syntheticDataMeta.category,
        contentType: syntheticDataMeta.contentType,
        difficulty: syntheticDataMeta.difficulty,
        prerequisites: syntheticDataMeta.prerequisites,
        leadsTo: syntheticDataMeta.leadsTo,
        relatedConcepts: syntheticDataMeta.relatedConcepts,
        careerPaths: syntheticDataMeta.careerPaths,
        tags: syntheticDataMeta.tags,
        updatedAt: new Date()
      }
    });

    console.log('✅ Synthetic data generation complete!');
    
    return NextResponse.json({
      success: true,
      count: vectorData.length,
      message: `Successfully generated ${vectorData.length} synthetic data records`
    });

  } catch (error) {
    console.error('❌ Error generating synthetic data:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}