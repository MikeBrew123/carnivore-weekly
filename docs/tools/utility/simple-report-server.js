#!/usr/bin/env node

/**
 * Simple Report Generation Server
 * Bare minimum: form data -> Claude API -> personalized report
 */

const http = require('http');
const Anthropic = require('@anthropic-ai/sdk').default;

const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/generate-report') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const formData = JSON.parse(body);

        // Calculate TDEE (Mifflin-St Jeor formula)
        let bmr;
        if (formData.sex === 'male') {
          bmr = 10 * formData.weight + 6.25 * formData.height - 5 * formData.age + 5;
        } else {
          bmr = 10 * formData.weight + 6.25 * formData.height - 5 * formData.age - 161;
        }

        const activityMultipliers = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          active: 1.725
        };

        const tdee = Math.round(bmr * (activityMultipliers[formData.activity] || 1.55));

        let calorieTarget;
        let surplusDeficit;
        if (formData.goal === 'fat_loss') {
          calorieTarget = Math.round(tdee * 0.85); // 15% deficit
          surplusDeficit = '-15% deficit';
        } else if (formData.goal === 'muscle_gain') {
          calorieTarget = Math.round(tdee * 1.1); // 10% surplus
          surplusDeficit = '+10% surplus';
        } else {
          calorieTarget = tdee;
          surplusDeficit = 'maintenance';
        }

        const proteinGrams = Math.round(formData.weight * 1); // 1g per lb
        const proteinCalories = proteinGrams * 4;
        const fatGrams = Math.round((calorieTarget - proteinCalories) / 9);

        // Generate personalized report with Claude
        console.log('Calling Claude API with user data...');
        const message = await claude.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: `Generate a personalized carnivore diet nutrition report for:

Person: ${formData.sex === 'male' ? 'Male' : 'Female'}, ${formData.age} years old
Measurements: ${formData.height}" tall, ${formData.weight} lbs
Activity Level: ${formData.activity}
Goal: ${formData.goal.replace('_', ' ')}

Calculated Macros:
- Maintenance TDEE: ${tdee} calories
- Target Calories: ${calorieTarget} (${surplusDeficit})
- Protein: ${proteinGrams}g (${proteinCalories} cal)
- Fat: ${fatGrams}g (remaining calories)

Please provide:
1. A brief personalized analysis of their macros
2. Food recommendations specific to carnivore diet
3. Daily meal timing suggestions
4. Hydration and electrolyte guidance
5. 2-3 specific meal examples with portions

Keep it practical, actionable, and encouraging. Use HTML formatting with <h3> for sections.`
            }
          ]
        });

        const reportContent = message.content[0].type === 'text' ? message.content[0].text : '';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          report: reportContent,
          macros: {
            calories: calorieTarget,
            protein: proteinGrams,
            fat: fatGrams
          }
        }));

      } catch (err) {
        console.error('Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🚀 Simple Report Server running on http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/api/generate-report with form data`);
});
