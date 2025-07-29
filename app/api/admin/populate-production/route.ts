import { NextRequest } from 'next/server';
import { batchUpsertVectors, VectorMetadata } from '@/lib/vector';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Populating production vector database with persona data...');
    
    // Create comprehensive persona data for production
    const productionPersonas = [
      {
        id: 'rohan-patel-prod',
        content: `Persona: Rohan Patel
Category: Career Switcher
Background: Rohan Patel is a 27-year-old from Mumbai, India, currently living in Wollongong, NSW, Australia. He completed his Bachelor's in Mechanical Engineering in India but pivoted to a Master's in Business Analytics at the University of Wollongong. Since graduating over a year ago, Rohan has struggled to land a relevant role in Australia's competitive market. He has applied for countless jobs in analytics, data, and ICT fields, but most responses are rejections. In the meantime, Rohan drives for Uber to cover living expenses, all while feeling mounting pressure as the months on his 485 post-study work visa tick away (he has 2.5 years left).
Key Points: 27, from India, regional NSW (Wollongong), Bachelor's in Mechanical Engineering (India), Completed Master's in Business Analytics (Australia), On 485 post-study visa (2.5 years left), Currently driving for Uber, unable to secure an ICT job after 1+ years of applications, Needs PY and one year ICT experience for 189/190 (PR), open to 491 due to regional location, Frustrated by lack of Wollongong ICT jobs and unclear pathway, Highly motivated for PR, wants real project experience, network, and advice, Seeks targeted support for career changers and regional job-seekers
Challenges: Feeling overwhelmed by job rejections, visa time pressure, driving Uber while overqualified
Goals: Get real project experience, secure ICT job, achieve permanent residency`,
        metadata: {
          persona: 'Rohan Patel',
          category: 'Career Switcher',
          country: 'India',
          visa_status: '485',
          location: 'Wollongong',
          tags: ['career_changer', 'international_student', 'business_analytics', 'visa_485', 'uber_driver', 'frustrated', 'overwhelmed']
        }
      },
      {
        id: 'sandeep-shrestha-prod',
        content: `Persona: Sandeep Shrestha
Category: Recent Graduate
Background: Sandeep Shrestha is a 23-year-old from Nepal who recently completed his Bachelor's in Computer Science in Australia. He's looking to start his career as a Full Stack Developer but needs guidance on building a portfolio, preparing for technical interviews, and understanding the Australian job market. He has impressive MERN stack skills but lacks team experience and Australian workplace exposure.
Key Points: 23 years old, from Nepal, Bachelor's in Computer Science (Australia), Recent graduate looking for Full Stack Developer roles, Needs portfolio building guidance, Preparing for technical interviews, Understanding Australian job market, Strong technical foundation but lacks industry experience, MERN stack developer with solo projects, Wants team experience and professional references
Challenges: Feeling lost about job market, needs portfolio guidance, lacks team experience
Goals: Get first developer job in Australia, build professional portfolio, gain team experience`,
        metadata: {
          persona: 'Sandeep Shrestha',
          category: 'Recent Graduate',
          country: 'Nepal',
          tags: ['recent_graduate', 'full_stack_developer', 'computer_science', 'portfolio', 'mern_stack', 'lost', 'career_guidance']
        }
      },
      {
        id: 'priya-singh-prod',
        content: `Persona: Priya Singh
Background: Priya Singh is an experienced Business Analyst from India working in Australia. She has 5+ years of experience in business analysis and is looking to advance her career to senior BA roles or transition into Product Management. She has strong analytical skills and stakeholder management experience.
Key Points: Experienced Business Analyst, 5+ years experience, From India working in Australia, Looking to advance to senior BA roles, Considering transition to Product Management, Strong analytical skills, Understanding stakeholder requirements, Process improvement expertise, Career advancement focused
Goals: Advance to senior business analyst roles, explore product management transition, career growth`,
        metadata: {
          persona: 'Priya Singh',
          category: 'Career Advancement',
          country: 'India',
          tags: ['experienced', 'business_analyst', 'career_advancement', 'product_management', 'stakeholder_management']
        }
      },
      {
        id: 'li-wen-prod',
        content: `Persona: Li Wen
Category: Career Switcher
Background: Li Wen is from China with a Bachelor in Economics who transitioned to a Master's in Business Analytics in Australia. She has business analytics and basic coding skills but lacks coding confidence and team/project experience. She's seeking PR pathway knowledge and local job opportunities in BA/ICT roles.
Key Points: Bachelor in Economics (China), Master's in Business Analytics (Australia), Business analytics and basic coding skills, Lacks coding confidence and team/project experience, Seeking PR pathway knowledge, Looking for BA/ICT job opportunities, Goal: BA/ICT job with ACS-recognised degrees and PR skill requirements
Goals: Build coding confidence, gain team experience, secure BA/ICT role for PR pathway`,
        metadata: {
          persona: 'Li Wen',
          category: 'Career Switcher', 
          country: 'China',
          visa_status: 'PR',
          tags: ['career_changer', 'business_analytics', 'coding', 'pr_pathway', 'confidence_building']
        }
      },
      {
        id: 'cybersecurity-course-info',
        content: `Cybersecurity Course Information
Program: Cyber Security Bootcamp
Description: 4-week intensive program addressing cloud security challenges in AWS and Azure environments
Duration: 4 weeks
Technologies: AWS Security, Azure Security, IAM, API Security, Cloud Protection
Target Audience: Career changers, international students, and professionals looking to upskill in cybersecurity
Contact: For course information and enrollment, contact the program advisors who can help with curriculum details, prerequisites, and scheduling options
Prerequisites: Basic understanding of IT concepts, willingness to learn cloud technologies
Career Outcomes: Cloud security specialist, cybersecurity analyst, security consultant roles`,
        metadata: {
          category: 'Course Information',
          course: 'Cybersecurity',
          tags: ['cybersecurity', 'bootcamp', 'aws', 'azure', 'cloud_security', 'course_info']
        }
      },
      {
        id: 'data-course-scheduling',
        content: `Data Course Scheduling and International Students
Flexible Learning Options: Programs designed with international students in mind, offering flexible scheduling to accommodate visa requirements and work restrictions
International Student Support: Dedicated support for students on various visa types (485, 500, student visas)
Scheduling Assistance: Academic advisors available to help plan course schedules around visa timelines and work requirements
Calendar Integration: Course scheduling systems that integrate with personal calendars and visa deadline tracking
Human Support: Access to academic counselors and international student advisors for personalized scheduling advice
Contact Process: Schedule appointments with academic advisors through online booking system or contact student services directly`,
        metadata: {
          category: 'Academic Support',
          tags: ['scheduling', 'international_students', 'visa_support', 'calendar', 'academic_advising', 'data_course']
        }
      },
      {
        id: 'visa-guidance-detailed',
        content: `International Visa and Study Guidance
485 Visa: Post-study work visa, Valid for 2-4 years depending on qualification, Allows full work rights, Path to permanent residency
Student Visa (500): Study duration visa, part-time work rights, pathway to 485 after graduation
Permanent Residency Pathways: 189 - Independent skilled, 190 - State nominated, 491 - Regional sponsored
Skills Assessment: ACS for ICT roles, Engineers Australia for engineering, CPA for accounting
Work Experience Requirements: Australian work experience adds migration points, relevant skilled employment crucial
Professional Year Programs: Available for accounting, engineering, and IT graduates to gain Australian work experience
Scheduling Considerations: Course timing must align with visa conditions and work restrictions
Human Advisors: Immigration advisors and student counselors available for personalized visa guidance`,
        metadata: {
          category: 'Visa Guidance',
          tags: ['visa', '485', '500', 'permanent_residency', 'skill_assessment', 'work_rights', 'scheduling']
        }
      }
    ];

    // Convert to vector format
    const vectors = productionPersonas.map((persona) => {
      const metadata: VectorMetadata = {
        id: persona.id,
        title: persona.metadata.persona || persona.metadata.category || persona.metadata.course || 'Career Guidance',
        content: persona.content,
        category: persona.metadata.category || 'career',
        contentType: 'career' as const,
        difficulty: 'intermediate' as const,
        prerequisites: [],
        leadsTo: [],
        relatedConcepts: [],
        careerPaths: ['business-analyst', 'full-stack-developer', 'data-analyst'],
        tags: persona.metadata.tags || [],
        confidenceScore: 0.95,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        id: persona.id,
        content: persona.content,
        metadata: metadata
      };
    });
    
    console.log(`🔄 Uploading ${vectors.length} production personas to vector database...`);
    
    // Upload to vector database
    const result = await batchUpsertVectors(vectors);
    
    if (result.success) {
      console.log('✅ Successfully populated production vector database!');
      return Response.json({
        success: true,
        message: 'Successfully populated production vector database',
        totalVectors: vectors.length,
        personas: productionPersonas.map(p => p.metadata.persona || p.metadata.category || p.metadata.course),
        results: result.results
      });
    } else {
      console.error('❌ Failed to upload vectors:', result.error);
      return Response.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Production upload error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}