# Shader Tutor

Shader Tutor is a WebGL development environment that teaches the user how to write
shaders step by step. Instead of generating code, users are encouraged to learn how to
write the code themselves.

## Explanation

For this project I chose Option B from the take-home assignment. I found it more flexible
and fun to ideate for this option, and I enjoy the tension between LLMs as a productivity
and learning tool.

When LLMs are used as a productivity tool, they remove the friction associated with doing.
But that friction is often what helps people learn. In college I took notes by hand in
class and rarely read them, but the act of taking them helped me organize my thinking and
retain the information in the lectures. I similarly was told my multiple music instructors
to learn songs by ear rather than looking up the tabs and notation. This was extremely
slow but rewarding.

## Principles and Choices
### Principles
- The app should build understanding rather than do the user's work for them.
- Understanding is built through friction and doing, but people will bounce if the friction isn't
  fun.
- The app should present attainable goals with quick feedback.

### Choices
- The app should never write code for the user, but it should happily go deep on any topic.
- Code should be compiled as the user types.
- The user should be able to get quick answers to questions about anything in the code by
  selecting them.
- Lessons should be step-by-step with each step demonstrating only a couple concepts.
- Lessons should lead to aesthetically pleasing results.


## Design

The Shader Tutor leans much more to the education than the productivity side, but if I
could say "Show me how to build a ripple shader for the background of my website that
responds to mouse clicks" and get a step-by-step lesson, I could see myself using
something like this on the job. Even before LLMs were important to my professional
workflow, I occassionally found myself doing something the "hard way" just so I wouldn't
have to Google for it the next time. Sometimes this even meant reading code from
StackOverflow and then writing it myself.


## Expansion

The nice thing about the Shader Tutor is that it's not at all limited to GLSL. It could be
easily tweaked to work in different development environments. I could also see it
working in other text-based systems like writing and math. It could possibly generate
tutorials for non-text based things, but we'd lose the feedback loop if it didn't have an
underlying parseable data structure.


## Measuring Success

Success of the Shader Tutor couldn't simply come down to usage numbers. If it's just fun
and not useful then I've made a useful business but failed as an educator. That said, it
could be difficult to measure how much users are actually learning. The simplest thing
would be to ask them. A more accurate method might be testing them with challenges that
don't provide any assistence, but in the age of LLMs, this could easily be gamed. A
combination of usage numbers and survey data would be a good heuristic at least.

## Scalability

Because the Shader Tutor can run as a lambda, it's very scalable. Obviously we'd need to
work out how to support millions of users making request to the Claude API – either by
letting them supply their own tokens or entering into an enterprise contract and charging
users subscriptions (which would mean some sort of account management).

## Design Process

I spent the first half hour brainstorming and jotting down stray thoughts. Some initial
ideas were:
 
shader toy or webaudio toy
- when you prompt it instructs you on how to write the code instead of writing it all for you

code explanation
- users can right click and get an explanation for anything in their code

music practice tutor
- claude analyzes your midi and suggests parts of the song to practice and at what tempo

breadboarding helper
- users are forced to do this hands on because it’s physical. claude instructs them on how to do it.
- can do it step by step rather than sending a whole diagram

vim instructor
- any time the user uses the mouse, claude suggests a way they could have used the keyboard

I went back over these ideas and scored them based on:
- effort
- how applicable it was to the assignment
- its demo-ability
- my own interest level

I narrowed the ideas down to:
- Shader Tutor
- VIM Instructor

I started with the VIM instructor because its goal was the most clear and testable. VIM is
a great example of a technology with a steep but rewarding learning curve, and the idea of
proposing alternatives to mouse usage is perfect in that it doesn't slow a user down if
they'd rather ignore it. I also decided to time-box it to 2 hours. 

Unfortunately the result wasn't great. I spent some time clicking and highlighting words
in the code and mentally comparing Claude's suggestions to my own ideas. Claude's
suggestions were rarely useful and sometimes inaccurate. After some prompt tuning, it
became clear that getting column and word position correct within the time frame would be
extremely difficult. I still like this idea and don't think it's impossible to get
working, but it wasn't a great candidate for the take-home.

I decided to pivot to the Shader Tutor. I already had a working code editor so I spent
some time fleshing out the idea further. My initial thinking was to let users prompt a
shader and then have the webapp walk the user step by step through the process of writing
it (without giving any actual code). In my conversation with Claude, it noted that
letting the user prompt a lesson might be difficult and that we could build a proof of
concept with a static one. This sounded fair to me.

After the initial prompt and code generation it was simply a matter of testing and
polishing the experience. It was clear to me fairly quickly while going through the first
couple tutorial steps, that this was fun and useful. WebGL has a great feedback loop,
and Claude's tutoring was helpful and relevant to each individual step.

The last few things I did were:
- fold in the "explain this piece of code" feature. This was very useful for GLSL because
  of all the built-ins (e.g. gl_FragCoord)
- edited the default questions to be more useful than "give me a hint": "Check my work",
  "What are some useful built-ins for this step."

Some things I'd like to still add:
- Markdown rendering in the chat panel (useful for code).
- The ability to prompt lessons.
- A lesson index page

