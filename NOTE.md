## thoughts
- Would be cool to be able to click on variables in the code and get LLM generated explanations.
- The LLM should be able to advance to the next step for the user.
- LLM is too proactive in answering more than is asked. this breaks flow.
- Some of the code requires odd resolutions. A square canvas doesn't convey this
  information well.
  - Let the user pick resolutions?
- The LLM should be well aware that the code is auto compiled. (No need to "run" it.)

## wont fix
- Is it possible for the LLM to check the rendered images against each other?
  - it is, but this is expensive and slow. the LLM is already doing a great job checking
    the code.

## done
- The LLM can verify the code easily. We should take advantage of that.
- Not knowing anything about shaders makes step 1 confusing.
  - It helps to ask questions, but it's not immediately clear that I can do that.
  - Would help if we fully explained what uv is supposed to be.
- text input should grow when user types

