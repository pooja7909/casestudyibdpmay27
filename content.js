// All teaching content. Practice questions are original, written for this lab — not IB questions.
const LABS = [
  {
    id: 1, title: 'Image Generation Techniques', badge: 'SLHL', lines: 'Lines 15–34', sim: 'studio', thumb: 'gen',
    big: 'The input you give a model decides how much control you get over the image.',
    sense: {
      prompt: 'Three Visionary Studios designers want a poster of a mountain lake. Ana types a detailed description. Ben uploads a colour-coded map showing where the sky, lake and trees go. Chen presses Generate with no input at all. Who has the most control over where the lake appears?',
      options: ['Ana, because her description is detailed', 'Ben, because the map fixes the layout', 'Chen, because the model chooses the best layout', 'All three have the same control'],
      answer: 1,
      reveal: 'Ben. A segmentation map labels every pixel, so the layout is fixed and the model only adds realistic detail. Ana’s prompt controls subject and style but leaves positions to the model. Chen’s output depends only on what the model learned in training.'
    },
    explore: {
      intro: 'The Generation Studio has three modes, matching the case study. Each one gives the model a different kind of input.',
      tasks: [
        '<b>Text-to-image:</b> build two prompts that differ only in style. What changes, and what stays the same?',
        '<b>Conditional:</b> paint a lake on the left, render it, then move it to the right. Try “class-conditional” as well.',
        '<b>Unconditional:</b> press Generate five times. Can you make it produce a city? Now switch the training data and try again.'
      ]
    },
    interpret: [
      ['Why did the segmentation map give you more control than the prompt?', 'The map is a pixel-level condition: every region’s class is fixed, so the model only decides texture and detail. A prompt describes the content in words and leaves the exact layout to the model.'],
      ['Unconditional mode never produced a city while it was trained on landscapes. What does that show?', 'Unconditional generation relies solely on patterns learned from the training data. The dataset decides what can appear.'],
      ['Which mode would you use to build a synthetic training dataset, and why?', 'Unconditional: it produces many varied, novel samples without anyone having to supply an input for each image.']
    ],
    defs: [
      ['Text-to-image generation', 'Creates images from a written prompt (e.g. DALL·E, Stable Diffusion). Useful for concept art and advertising where specific themes or styles are needed.'],
      ['Conditional image generation', 'Generates images from specific inputs (class labels, sketches, segmentation maps) so outputs align with predefined objectives or styles.'],
      ['Class-conditional model', 'Generates a specific category of image, such as animals or landscapes.'],
      ['Image-to-image translation', 'Transforms one image type into another, e.g. sketch → realistic rendering, black-and-white → colour.'],
      ['Segmentation map', 'An image in which every pixel is labelled with a class (sky, water, tree…), used to control layout.'],
      ['Unconditional image generation', 'No predefined input; relies solely on patterns learned from training data. Good for exploratory creativity, abstract art, novel visuals and synthetic datasets.']
    ],
    write: {
      prompt: 'Distinguish between conditional and unconditional image generation, using an example from Visionary Studios.', marks: 4,
      points: [
        ['Conditional generation uses a specific input (class label, sketch, segmentation map or prompt)', ['input', 'label', 'sketch', 'segmentation', 'prompt']],
        ['…so the output aligns with a predefined objective or artistic style', ['align', 'objective', 'style', 'control']],
        ['Unconditional generation has no input and relies solely on patterns learned from training data', ['no input', 'without', 'training data', 'learned', 'pattern']],
        ['Applied example, e.g. rendering a client’s sketch in brand style vs. unconditional output for exploratory concept art or synthetic data', ['client', 'concept', 'synthetic', 'advert', 'brand', 'visionary']]
      ]
    },
    mcq: [
      { q: 'Which of these is an example of image-to-image translation?', o: ['Turning a pencil sketch into a realistic rendering', 'Generating an image from the text “a red car”', 'Generating random images with no input', 'Labelling every pixel of a photo with a class'], a: 0, why: 'Image-to-image translation transforms one image type into another, such as sketch → render or black-and-white → colour.' },
      { q: 'A class-conditional model is given the label “landscape”. What does it produce?', o: ['A segmentation map of a landscape', 'An image from the landscape category', 'A text description of a landscape', 'A random image from any category'], a: 1, why: 'Class-conditional models generate images of a specific category chosen by the label.' },
      { q: 'Which statement about unconditional image generation is correct?', o: ['It needs a sketch as input', 'It always produces the same image', 'Its output depends only on patterns learned from training data', 'It gives the most control over layout'], a: 2, why: 'With no input, the only thing shaping the output is what the model learned from its training data.' },
      { q: 'Why is text-to-image generation useful for concept art and advertising?', o: ['It needs no training data', 'Creators can describe specific themes or styles in words and get matching visuals', 'It is always faster than any other method', 'It guarantees the exact position of every object'], a: 1, why: 'Detailed text descriptions are translated into visuals, which suits work where specific themes or styles are required.' }
    ],
    written: [
      { q: 'Describe how a segmentation map is used in conditional image generation.', marks: 3, points: [['Each pixel/region of the map is labelled with a class (e.g. sky, water, tree)', ['pixel', 'label', 'class', 'region']], ['The model generates realistic content for each labelled region', ['generate', 'realistic', 'fill', 'render']], ['So the layout/composition of the output matches the map and predefined objectives', ['layout', 'composition', 'position', 'match', 'objective']]] }
    ]
  },
  {
    id: 2, title: 'Diffusion Models', badge: 'core', lines: 'Lines 35–47', sim: 'diffusion', thumb: 'diff',
    big: 'A diffusion model creates an image by removing noise, a small amount at a time.',
    sense: {
      prompt: 'A diffusion model starts from pure random noise and ends with a picture of a lake. Predict: what must the denoiser have learned to make that possible?',
      options: ['Patterns from many training images of similar scenes', 'A stored copy of this exact lake photo', 'Only the words in the prompt', 'Nothing, the result is pure chance'],
      answer: 0,
      reveal: 'Patterns from its training data. The denoiser (usually a CNN) gradually reconstructs features it learned in training, so the dataset determines what kind of content can appear.'
    },
    explore: {
      intro: 'Run the reverse (generation) process, scrub through the steps, then look at what the choices cost. All timings are illustrative.',
      tasks: [
        'Run at <b>50 steps</b>. Scrub the slider: at which step can you first recognise the scene?',
        'Switch to <b>10 steps</b>. Compare the final image and the cost panel.',
        'Change the <b>training data</b> to cities and run the same noise seed again.',
        'Set <b>1024 px</b>, <b>1,000 steps</b> and a 2,000-image campaign. How long does it take? Now tick <b>latent diffusion</b>.',
        'Switch to <b>Forward (training)</b> to see how training images are noised.'
      ]
    },
    interpret: [
      ['Why does generation time rise with both the number of steps and the resolution?', 'Each step is a full pass through the CNN, and each pass processes every value in the image. Cost grows roughly with steps × pixels.'],
      ['The same starting noise gave a city after you changed the dataset. Why?', 'The denoiser reconstructs features it learned during training; the nature of the generated content is determined by the dataset used to train the model.'],
      ['What is the trade-off when you cut the number of steps?', 'Generation is faster and cheaper, but fewer refinement steps can leave noise or lose fine detail. Better samplers reduce, but do not remove, this loss.']
    ],
    defs: [
      ['Noise injection', 'Introducing random noise as the starting point for image generation.'],
      ['Denoising', 'Removing noise step by step so coherent structure emerges.'],
      ['Neural denoiser (CNN)', 'A convolutional neural network that predicts the noise to remove at each step, reconstructing features learned in training.'],
      ['Diffusion model', 'Generates images by an iterative denoising process starting from random noise.'],
      ['DDPM', 'Denoising diffusion probabilistic model: formalises gradually adding noise (training) and removing it (generation). The basis of modern diffusion models.'],
      ['Computational cost', 'Many steps × a large network × high resolution = significant GPU time, memory and energy; optimisation is crucial for creative industries.']
    ],
    write: {
      prompt: 'Explain why diffusion models require significant computational resources when generating photorealistic images.', marks: 4,
      points: [
        ['Generation is iterative: many denoising steps are needed (e.g. 50 to 1,000)', ['iterative', 'steps', 'many', 'repeated']],
        ['Each step is a full forward pass through a large neural network (CNN)', ['cnn', 'network', 'pass', 'neural']],
        ['Photorealistic, high-resolution images mean millions of values processed per step', ['resolution', 'pixel', 'million', 'photoreal']],
        ['So time, GPU memory and energy scale with steps × resolution (and number of images)', ['gpu', 'memory', 'time', 'energy', 'hardware']]
      ]
    },
    mcq: [
      { q: 'What is the starting point for image generation in a diffusion model?', o: ['A blank white image', 'Random noise', 'A segmentation map', 'The last image generated'], a: 1, why: 'Noise injection: random noise is introduced as the starting point and refined over many steps.' },
      { q: 'What is the role of the CNN in a diffusion model?', o: ['It stores every training image', 'It predicts and removes noise at each step, reconstructing learned features', 'It decides whether an image is real or fake', 'It compresses the prompt into words'], a: 1, why: 'The neural denoiser, typically a CNN, gradually reconstructs features based on patterns learned during training.' },
      { q: 'In a DDPM, what happens during training?', o: ['Noise is gradually added to training images and the model learns to reverse it', 'Two networks compete against each other', 'Images are mapped exactly and reversibly to noise', 'The model memorises a fixed set of outputs'], a: 0, why: 'DDPM formalises gradually adding noise in training and removing it in generation.' },
      { q: 'Which change would most reduce the time to generate an image?', o: ['Doubling the resolution', 'Increasing from 50 to 1,000 steps', 'Denoising in a compressed latent space with fewer steps', 'Using a larger CNN'], a: 2, why: 'Fewer values per step (latent space) and fewer steps both cut the number of computations.' }
    ],
    written: [
      { q: 'Outline two ways Visionary Studios could reduce the computational demands of diffusion models.', marks: 4, points: [['Reduce the number of denoising steps (faster samplers)…', ['fewer steps', 'sampler', 'reduce steps', 'ddim']], ['…which cuts the number of CNN passes per image', ['pass', 'computation', 'faster', 'time']], ['Use latent diffusion / generate at low resolution then upscale / distillation…', ['latent', 'compress', 'upscale', 'resolution', 'distil']], ['…which reduces the values processed per step (or uses better hardware such as GPUs/cloud)', ['values', 'pixels', 'gpu', 'cloud', 'hardware']]] }
    ]
  },
  {
    id: 3, title: 'Generative Adversarial Networks', badge: 'HL', lines: 'Lines 48–59', sim: 'gan', thumb: 'gan',
    big: 'Two networks compete: one forges images, the other tries to catch the fakes.',
    sense: {
      prompt: 'Look at Figure 2 above. Predict: if the discriminator becomes nearly perfect at spotting fakes very early in training, what happens to the generator?',
      options: ['It improves faster than ever', 'It gets almost no useful feedback and stops improving', 'It turns into a discriminator', 'It produces a wider variety of images'],
      answer: 1,
      reveal: 'It stalls. If every fake is rejected with total confidence, the generator gets no useful signal about how to improve. This is one form of the training instability the case study mentions.'
    },
    explore: {
      intro: 'The GAN Arena is a toy model. It reproduces the behaviour described in the case study (balance, instability, mode collapse) but it is not a real neural network.',
      tasks: [
        '<b>Balanced:</b> Generator 0.5, Discriminator 0.5. Train. Watch the discriminator’s accuracy settle near 50%.',
        '<b>Discriminator too strong:</b> D 1.0, G 0.2. What happens to quality?',
        '<b>Generator too strong:</b> G 1.0, D 0.2. Count the image types in the samples.',
        'Turn on <b>minibatch discrimination</b> and <b>label smoothing</b>, then retry the unstable settings.'
      ]
    },
    interpret: [
      ['Why does the discriminator’s accuracy fall towards 50% when training goes well?', 'The generator’s fakes become so realistic that the discriminator can no longer tell them apart from real images, so it is effectively guessing.'],
      ['What did you see when the generator overpowered the discriminator?', 'Mode collapse: the generator found a few outputs that fool the discriminator and kept producing them, so the samples lost the full diversity of the dataset.'],
      ['Why does a too-strong discriminator also cause problems?', 'It rejects every fake so confidently that the generator receives almost no useful feedback, so its quality stops improving: training becomes unstable.']
    ],
    defs: [
      ['GAN', 'Two neural networks, a generator and a discriminator, trained together in a competitive framework.'],
      ['Generator', 'Transforms a D-dimensional noise vector into a candidate (synthetic) image; improves by learning to deceive the discriminator.'],
      ['Discriminator', 'Compares outputs with real training images and predicts real or fake; improves at distinguishing them.'],
      ['D-dimensional noise vector', 'A list of D random numbers that the generator turns into an image; different vectors give different images.'],
      ['Adversarial dynamic', 'The competition that pushes both networks to improve and produces sharp, high-quality images.'],
      ['Mode collapse', 'The generator produces limited variations instead of capturing the full diversity of the dataset.']
    ],
    write: {
      prompt: 'Explain how the adversarial dynamic between the generator and discriminator leads to realistic images.', marks: 4,
      points: [
        ['The generator turns a noise vector into synthetic images', ['noise vector', 'synthetic', 'candidate', 'generator']],
        ['The discriminator compares them with real training images and predicts real or fake', ['real', 'fake', 'discriminator', 'compare']],
        ['Feedback from the discriminator is used to update the generator so it deceives the discriminator better', ['feedback', 'deceive', 'fool', 'update', 'improve']],
        ['Both improve in competition until fakes are indistinguishable from real images', ['compet', 'both', 'indistinguishable', 'realistic', '50']]
      ]
    },
    mcq: [
      { q: 'What does the generator take as input?', o: ['A real image from the dataset', 'A D-dimensional noise vector', 'The discriminator’s weights', 'A segmentation map'], a: 1, why: 'The generator transforms a D-dimensional noise vector into candidate images.' },
      { q: 'What does the discriminator output?', o: ['A new image', 'A prediction of whether an image is real or fake', 'A noise vector', 'A text prompt'], a: 1, why: 'It evaluates images and produces predicted labels: real or fake.' },
      { q: 'Which best describes mode collapse?', o: ['The discriminator stops working', 'Training becomes faster', 'The generator produces limited variations instead of the dataset’s full diversity', 'The images become blurry'], a: 2, why: 'Mode collapse is a loss of diversity: the generator keeps producing a few similar outputs.' },
      { q: 'Why are GANs able to produce sharp images?', o: ['They denoise over 1,000 steps', 'The adversarial dynamic pushes the generator to make images the discriminator cannot tell from real ones', 'They store the training images', 'They use exact, reversible mappings'], a: 1, why: 'The case study identifies the adversarial dynamic as key to a GAN’s sharp, high-quality images.' }
    ],
    written: [
      { q: 'Explain what is meant by mode collapse and one technique that could reduce it.', marks: 3, points: [['The generator produces only a limited set of similar outputs…', ['limited', 'similar', 'same', 'few']], ['…instead of capturing the full diversity of the training dataset', ['diversity', 'variety', 'dataset']], ['A mitigation technique, e.g. minibatch discrimination, balancing learning rates, Wasserstein loss, label smoothing', ['minibatch', 'learning rate', 'wasserstein', 'smoothing', 'balanc', 'spectral']]] }
    ]
  },
  {
    id: 4, title: 'Hybrid Models', badge: 'HL', lines: 'Lines 60–75', sim: 'hybrid', thumb: 'hybrid',
    big: 'No single model wins on every criterion, so hybrids combine their strengths.',
    sense: {
      prompt: 'A client asks Visionary Studios to prove exactly how an image was produced, and to regenerate it identically next year. Predict: which model type is built for this?',
      options: ['A VAE', 'A GAN', 'A flow-based model', 'Any model, since they are all reversible'],
      answer: 2,
      reveal: 'A flow-based model. It learns an exact mapping between noise and images that can be reversed without loss, so each image can be traced and reproduced. That suits precision, reproducibility and transparency.'
    },
    explore: {
      intro: 'Three workbenches: walk through a VAE’s latent space, compare a VAE with a flow model, then build your own hybrid.',
      tasks: [
        '<b>Latent space:</b> drag the point from the lakes cluster to the cities cluster. Watch the decoded image change gradually.',
        '<b>VAE vs flow:</b> encode and decode the same image with each. Compare the reconstruction error.',
        '<b>Hybrid builder:</b> start with diffusion only, then add a VAE. Which scores change, and why?',
        'Try <b>GAN + VAE</b> and <b>diffusion + GAN</b>. Which combination would you recommend for a fast ad campaign?'
      ]
    },
    interpret: [
      ['Why did the decoded image change smoothly as you moved through the latent space?', 'The latent space is organised so that similar images are close together; moving a small distance produces a small, gradual change. This makes VAEs good for experimentation and artistic exploration.'],
      ['Why was the flow model’s reconstruction error zero but the VAE’s was not?', 'A flow model’s mapping is exact and invertible, so no information is lost. A VAE compresses the image into a smaller latent space, so some detail is lost and reconstructions are often slightly blurry.'],
      ['Why does adding a VAE to a diffusion model speed it up?', 'The diffusion process runs in the VAE’s compressed latent space instead of on millions of pixels, so each step processes far fewer values (latent diffusion, as in Stable Diffusion).']
    ],
    defs: [
      ['Hybrid model', 'Combines different types of generative AI to overcome the limits of one approach: higher quality, better control and more flexibility.'],
      ['Variational autoencoder (VAE)', 'Learns to represent images in a latent space; images can be modified or generated by exploring that space.'],
      ['Latent space', 'A compressed and organised version of the data in which similar images are placed close together.'],
      ['Flow-based model', 'Learns an exact, reversible mapping between noise and images: precise, reproducible and transparent.'],
      ['Latent diffusion', 'A real hybrid: a VAE compresses images, diffusion denoises in the latent space, the VAE decoder outputs pixels.'],
      ['Strengths to combine', 'Diffusion: quality. GAN: speed and sharpness. VAE: flexible latent space. Flow: traceability.']
    ],
    write: {
      prompt: 'Evaluate the use of a hybrid model that combines a VAE with a diffusion model for Visionary Studios.', marks: 6,
      points: [
        ['Diffusion gives high-quality, photorealistic, diverse images', ['quality', 'photoreal', 'diverse']],
        ['VAE compresses images into a latent space, so diffusion runs on far fewer values', ['latent', 'compress', 'fewer']],
        ['Result: faster/cheaper generation, easing the computational challenge', ['fast', 'cheap', 'comput', 'efficien']],
        ['The organised latent space supports flexible editing / exploration for creative work', ['edit', 'explor', 'flexib', 'organised']],
        ['Limitation: still iterative; VAE decoding can lose fine detail; more complex system to train and maintain', ['still', 'detail', 'complex', 'blur', 'limitation']],
        ['Justified conclusion linked to Visionary Studios’ needs (quality + efficiency + consistency)', ['conclu', 'overall', 'therefore', 'visionary', 'recommend']]
      ]
    },
    mcq: [
      { q: 'What is a latent space?', o: ['The empty space around an image', 'A compressed, organised version of the data where similar images are close together', 'The GPU memory used during training', 'The set of real images used by a discriminator'], a: 1, why: 'Lines 65–66 define the latent space as a compressed and organised version of the original data.' },
      { q: 'Which property is unique to flow-based models in this list?', o: ['They use noise', 'Their mapping between noise and images can be reversed without loss', 'They generate images', 'They can be trained on datasets'], a: 1, why: 'Flow-based models learn an exact mapping that can be reversed without loss.' },
      { q: 'When are VAEs especially useful, according to the case study?', o: ['When exact reproducibility is required', 'When flexibility, experimentation or artistic exploration is important', 'When images must be generated in one step', 'When no training data is available'], a: 1, why: 'VAEs are useful when flexibility, experimentation or artistic exploration is important.' },
      { q: 'Why might a studio choose a hybrid model?', o: ['It is always simpler to build', 'It removes the need for training data', 'It can combine strengths of different models for more reliable, consistent, high-quality output', 'It avoids all ethical issues'], a: 2, why: 'Combining VAEs, flows, GANs and diffusion can give more reliable, consistent and high-quality generation.' }
    ],
    written: [
      { q: 'Compare VAEs and flow-based models.', marks: 4, points: [['Both map between images and a simpler representation (latent space / noise)', ['both', 'map', 'latent', 'noise']], ['VAE: compressed, organised latent space for flexible exploration and modification', ['compress', 'organised', 'explor', 'flexib']], ['Flow: exact, invertible mapping with no information loss', ['exact', 'invert', 'revers', 'loss']], ['So flow suits precision/reproducibility/transparency; VAE suits experimentation (and may be blurrier)', ['reproduc', 'transparen', 'precision', 'experiment', 'blur']]] }
    ]
  },
  {
    id: 5, title: 'Evaluating Generative AI Models', badge: 'SLHL', lines: 'Lines 76–95', sim: 'evaluate', thumb: 'eval',
    big: 'Choose a model by weighing the criteria that matter for the job in front of you.',
    sense: {
      prompt: 'A client needs 3,000 social-media images by tomorrow morning, all featuring the same mascot, using the studio’s existing servers. Which two criteria matter most?',
      options: ['Output quality and training stability', 'Computational efficiency and consistency', 'Flexibility and output quality', 'Training stability and scalability'],
      answer: 1,
      reveal: 'Computational efficiency (thousands of images overnight on existing hardware) and consistency (the same mascot in every image). Quality still matters, but these two decide whether the job is possible at all.'
    },
    explore: {
      intro: 'Pick a client brief, set how much each criterion matters, and see which model the weighted scores favour. Then test character consistency.',
      tasks: [
        'Choose <b>Brief A</b> (luxury print ad). Which model wins? Which weight would you need to change to make a GAN win?',
        'Switch to <b>Brief B</b> (3,000 images overnight). Why does the ranking change?',
        'Switch to <b>Brief C</b> (recurring mascot). Then use the consistency test: generate with and without an embedding.'
      ]
    },
    interpret: [
      ['Why did the recommended model change between briefs?', 'Each brief weights the criteria differently. A model is only “best” relative to the goals: photoreal quality for a luxury ad, efficiency for volume, consistency for a recurring character.'],
      ['How did the embedding keep the mascot consistent?', 'An embedding is a learned vector representing the character. Reusing it in every generation gives the same appearance across images, protecting brand identity.'],
      ['What is the difference between character consistency and style adherence?', 'Character consistency keeps a recurring character or motif looking the same across images; style adherence makes images match the artistic style or theme specified in the prompt.']
    ],
    defs: [
      ['Output quality', 'High-resolution, photorealistic, stylistically coherent images that fit project goals.'],
      ['Computational efficiency', 'Whether existing infrastructure can train and deploy the model without significant delays or resource constraints.'],
      ['Training stability', 'Some models give repetitive or poor outputs; others train reliably but need longer training and more resources.'],
      ['Flexibility and scalability', 'Adapting to ads, concept art and branded assets, and scaling to future projects.'],
      ['Character consistency', 'Uniform appearance of recurring characters or motifs across images; helped by embedding-based approaches.'],
      ['Style adherence', 'Conditional models (e.g. text-to-image) must match the artistic style or theme given in the prompt.']
    ],
    write: {
      prompt: 'Discuss two criteria Visionary Studios should use when choosing a generative AI model for a large advertising campaign.', marks: 6,
      points: [
        ['Identifies a first criterion (e.g. computational efficiency)', ['efficien', 'comput', 'infrastructure']],
        ['Explains it in context: many images, deadlines, existing hardware', ['deadline', 'many', 'campaign', 'hardware', 'gpu']],
        ['Identifies a second criterion (e.g. consistency or output quality)', ['consisten', 'quality', 'brand']],
        ['Explains it in context: brand identity / photoreal quality for clients', ['brand', 'identity', 'client', 'photoreal']],
        ['Weighs the trade-off between criteria (e.g. quality vs speed)', ['trade', 'however', 'balance', 'but']],
        ['Reaches a justified judgement', ['conclu', 'therefore', 'overall', 'most important']]
      ]
    },
    mcq: [
      { q: 'Which criterion asks whether existing infrastructure can support the model?', o: ['Output quality', 'Computational efficiency', 'Style adherence', 'Flexibility'], a: 1, why: 'Lines 81–82: computational efficiency concerns training and deployment on the company’s existing infrastructure.' },
      { q: 'Which approach does the case study suggest for character consistency?', o: ['Embedding-based approaches', 'Unconditional generation', 'Increasing the number of denoising steps', 'Removing the discriminator'], a: 0, why: 'Line 92: embedding-based approaches can help achieve character consistency.' },
      { q: 'A client’s brand guide demands “flat pastel illustration” in every image. Which consideration is this?', o: ['Training stability', 'Style adherence', 'Scalability', 'Character consistency'], a: 1, why: 'Style adherence: outputs must align with the style or theme specified by prompts.' },
      { q: 'What does training stability refer to?', o: ['How reliably a model trains to good results without repetitive or poor outputs', 'The physical stability of servers', 'How stable the client relationship is', 'How many images the model can store'], a: 0, why: 'Lines 83–85: some models produce repetitive or suboptimal outputs; others train more reliably but need more time and resources.' }
    ],
    written: []
  },
  {
    id: 6, title: 'Ethics and Law', badge: 'SLHL', lines: 'Lines 96–105', sim: 'ethics', thumb: 'ethics',
    big: 'Whatever goes into the training data comes out in the images.',
    sense: {
      prompt: 'A model’s training images of business leaders are about 80% men. A designer asks it for “a CEO giving a presentation”. Predict the output.',
      options: ['An even mix of men and women', 'Mostly men', 'No people at all', 'Mostly women'],
      answer: 1,
      reveal: 'Mostly men. The model reproduces the patterns in its data, so a skewed dataset produces exclusionary or inaccurate representations. That is why datasets must be assessed for bias.'
    },
    explore: {
      intro: 'You are curating a training set for a client campaign. Exclude risky images, fix the balance, then decide how to disclose AI use.',
      tasks: [
        'Click images to <b>exclude</b> any whose licence makes them risky. Watch the IP-risk meter.',
        'Check the <b>representation</b> meter for images of professionals. Use “Add licensed images” to rebalance it.',
        'Keep the dataset <b>large enough</b>: excluding too much hurts quality.',
        'Answer the three <b>disclosure</b> scenarios.'
      ]
    },
    interpret: [
      ['Why not simply exclude every image with any doubt?', 'A model needs enough varied data for quality. Curation is a balance: remove legal and ethical risks, then replace what you removed with properly licensed, representative images.'],
      ['How does rebalancing reduce bias?', 'The model learns from the distribution in its data. Adding properly licensed images of under-represented groups makes the learned patterns less skewed, so outputs are more inclusive and accurate.'],
      ['Why does disclosure matter even if the image looks perfect?', 'Clients and audiences trust the studio. Clear guidelines on disclosing AI-generated content maintain that trust and avoid misleading people about how work was made.']
    ],
    defs: [
      ['Dataset curation', 'Carefully selecting training data to avoid copyrighted material and comply with intellectual property laws.'],
      ['Intellectual property (IP)', 'Legal rights over creative work; using it to train or generate without permission risks infringement.'],
      ['Bias and fairness', 'Biased datasets can cause exclusionary or inaccurate representations in generated outputs.'],
      ['Bias mitigation', 'Auditing datasets, rebalancing under-represented groups, testing outputs and keeping human review.'],
      ['Transparency and AI disclosure', 'Clear guidelines for disclosing AI-generated content to maintain trust with clients and audiences.'],
      ['Licence', 'The terms under which an image may be used; some stock licences exclude AI training.']
    ],
    write: {
      prompt: 'Discuss the ethical and legal considerations Visionary Studios faces when using large datasets to train generative AI models.', marks: 6,
      points: [
        ['Copyright / IP: datasets may contain material the studio has no right to use', ['copyright', 'intellectual', 'ip', 'licen']],
        ['Curation response: licensed, owned or public-domain sources; record provenance', ['curat', 'licensed', 'public domain', 'source', 'provenance']],
        ['Bias: skewed data leads to exclusionary or inaccurate representations', ['bias', 'exclusion', 'represent', 'stereotyp']],
        ['Mitigation: audit, rebalance, test outputs, human review', ['audit', 'rebalanc', 'test', 'review', 'mitigat']],
        ['Transparency: disclose AI use to clients and audiences to maintain trust', ['disclos', 'transparen', 'trust', 'label']],
        ['Weighs costs vs benefits and reaches a justified conclusion', ['conclu', 'however', 'therefore', 'cost']]
      ]
    },
    mcq: [
      { q: 'What is the main purpose of dataset curation in the case study?', o: ['To make training faster', 'To avoid copyrighted material and comply with IP law', 'To increase image resolution', 'To reduce the number of denoising steps'], a: 1, why: 'Lines 99–100: datasets must be curated to avoid copyrighted material and ensure compliance with IP laws.' },
      { q: 'A model rarely depicts older people in office scenes. What is the most likely cause?', o: ['Too many denoising steps', 'Bias in the training dataset', 'Mode collapse in a diffusion model', 'The prompt was too long'], a: 1, why: 'Under-representation in training data leads to exclusionary outputs.' },
      { q: 'Which action best supports transparency?', o: ['Removing metadata from images', 'Telling clients and audiences when content is AI-generated', 'Using more training data', 'Increasing resolution'], a: 1, why: 'Lines 103–105: clear guidelines for disclosing AI-generated content maintain trust.' },
      { q: 'Which image is safest to include in a training set?', o: ['A portfolio image scraped from an artist’s website', 'A stock photo whose licence excludes AI training', 'A photo from the studio’s own photoshoot', 'An image with an unknown source'], a: 2, why: 'The studio owns the rights to its own photoshoot images.' }
    ],
    written: []
  },
  {
    id: 7, title: 'Challenges & Exam Prep', badge: 'SLHL', lines: 'Answer pointers', sim: 'exam', thumb: 'exam',
    big: 'The booklet’s challenges point to the extended questions. Practise answering them under time pressure.',
    sense: {
      prompt: 'An “evaluate” question is worth 6 marks. Which plan scores best?',
      options: ['List six facts about diffusion models', 'Explain strengths and weaknesses, apply them to Visionary Studios, then give a justified conclusion', 'Write a definition, then stop', 'Describe how GANs work in as much detail as possible'],
      answer: 1,
      reveal: 'Evaluation needs both sides, applied to the scenario, and a conclusion you justify. Listing facts or describing without judgement caps your marks.'
    },
    explore: {
      intro: 'Use the challenge pointers, then try the question bank or a timed mock Section B.',
      tasks: [
        'Read the <b>answer pointers</b> for each challenge at your level.',
        'Pick a question, write your answer, then reveal the mark points and tick what you covered.',
        'Try a <b>timed mock</b>: SL about 20 minutes for 12 marks, HL about 40 minutes for 24 marks (suggested timings).'
      ]
    },
    interpret: [
      ['Which mark points did you miss most often?', 'Usually the application (“…for Visionary Studios because…”) and the conclusion. Add one sentence of context and one of judgement to every extended answer.'],
      ['How should the number of marks shape your answer?', 'Roughly one developed point per mark. A [4] “explain” needs about four linked cause → effect points; a [2] “define” needs a precise statement.']
    ],
    defs: [
      ['Define / State', 'A precise meaning or fact. No extended explanation.'],
      ['Describe / Outline', 'Give the main features or steps.'],
      ['Explain', 'Give reasons or causes: “because… so…”.'],
      ['Compare', 'Similarities and differences, referring to both throughout.'],
      ['Discuss', 'Offer a considered review with a range of arguments, factors or hypotheses.'],
      ['Evaluate / To what extent', 'Weigh strengths and limitations and reach a justified conclusion.']
    ],
    write: null,
    mcq: [
      { q: 'A question says “Explain why…” and is worth [4]. What should your answer contain?', o: ['Four separate definitions', 'About four linked points giving reasons (cause → effect), applied to the scenario', 'A single sentence', 'A labelled diagram only'], a: 1, why: 'Explain = give reasons. Roughly one developed point per mark.' },
      { q: 'Which ending best completes an “evaluate” answer?', o: ['A list of further reading', 'A justified conclusion that weighs the points for Visionary Studios', 'A repeat of the question', 'A definition of the key term'], a: 1, why: 'Evaluate requires weighing strengths and limitations and reaching a justified conclusion.' }
    ],
    written: []
  },
  {
    id: 8, title: 'Glossary & Term Drill', badge: 'SLHL', lines: 'Searchable', sim: 'glossary', thumb: 'gloss',
    big: 'Use the booklet’s exact terms. They are what examiners look for.',
    sense: {
      prompt: 'Which sentence uses case-study terminology most precisely?',
      options: ['The AI cleans up the static until a picture appears', 'Through iterative denoising, a CNN removes predicted noise from the injected noise until a coherent image emerges', 'The computer draws the image slowly', 'The model fixes a blurry picture'],
      answer: 1,
      reveal: 'The second option names the process (iterative denoising), the component (a CNN) and the starting point (noise injection). Precise terms earn marks.'
    },
    explore: {
      intro: 'Search the glossary, flip flashcards, then race the matching drill.',
      tasks: ['Search for a term you are unsure about.', 'Go through the flashcards. Say the definition aloud before flipping.', 'Get a perfect score in the matching drill.']
    },
    interpret: [
      ['Which pairs of terms are easiest to confuse?', 'Common pairs: conditional vs unconditional; noise injection vs denoising; VAE vs flow-based model; generator vs discriminator; character consistency vs style adherence. Write one sentence that separates each pair.'],
      ['Why do definitions alone rarely earn full marks?', 'Most case-study marks are for applying a term: saying what it does, why it matters, and what it means for Visionary Studios.']
    ],
    defs: [],
    write: {
      prompt: 'Write a paragraph describing how Visionary Studios could generate an advertising image, using at least five glossary terms correctly.', marks: 5,
      points: [
        ['Uses “noise injection” correctly', ['noise injection']],
        ['Uses “denoising” / “iterative denoising” correctly', ['denois']],
        ['Uses “CNN” / “convolutional neural network” correctly', ['cnn', 'convolutional']],
        ['Uses “text-to-image” or “conditional” generation correctly', ['text-to-image', 'conditional']],
        ['Uses an ethics term (dataset curation, bias mitigation, disclosure) correctly', ['curation', 'bias', 'disclos']]
      ]
    },
    mcq: [
      { hl: true, q: 'Which term means “a compressed and organised version of the data where similar images are close together”?', o: ['Segmentation map', 'Latent space', 'Noise vector', 'Training dataset'], a: 1, why: 'That is the case study’s definition of latent space (lines 65–66).' },
      { hl: true, q: 'Which term describes a generator producing limited variations?', o: ['Training stability', 'Mode collapse', 'Style adherence', 'Noise injection'], a: 1, why: 'Mode collapse: the generator fails to capture the full diversity of the dataset.' },
      { q: 'Which term describes converting a black-and-white image into colour?', o: ['Image-to-image translation', 'Unconditional generation', 'Denoising', 'Dataset curation'], a: 0, why: 'Image-to-image translation transforms one image type into another.' }
    ],
    written: []
  }
];

const GLOSSARY = [
  ['Bias mitigation', 'SL', 'Steps to reduce unfair or skewed outputs: auditing and rebalancing data, testing outputs, human review.'],
  ['Character consistency', 'SL', 'A recurring character or motif keeps the same appearance across many images.'],
  ['Convolutional neural network (CNN)', 'SL', 'A neural network whose filters slide over an image to detect spatial features; typically the neural denoiser in diffusion models.'],
  ['Dataset curation', 'SL', 'Selecting and checking training data to avoid copyrighted material, comply with IP law, and ensure quality and balance.'],
  ['Denoising', 'SL', 'Removing noise from an image step by step so coherent structure emerges.'],
  ['Denoising diffusion probabilistic model (DDPM)', 'SL', 'Formalises gradually adding noise during training and removing it during generation; the basis of modern diffusion models.'],
  ['Diffusion model', 'SL', 'Generates images through an iterative denoising process, starting from random noise.'],
  ['Embedding-based approach', 'SL', 'Represents a character or concept as a learned vector that is reused to keep outputs consistent.'],
  ['Image generation – conditional', 'SL', 'Output is guided by a specific input such as a class label, sketch or segmentation map.'],
  ['Image generation – unconditional', 'SL', 'No predefined input; output relies solely on patterns learned from training data.'],
  ['Image-to-image translation', 'SL', 'Transforms one image type into another, e.g. sketch → realistic render, black-and-white → colour.'],
  ['Noise injection', 'SL', 'Introducing random noise as the starting point for image generation.'],
  ['Segmentation map', 'SL', 'An image in which every pixel is labelled with a class, used to control the layout of a generated image.'],
  ['Text-to-image generation', 'SL', 'Generating images from written prompts, e.g. DALL·E or Stable Diffusion.'],
  ['Training stability', 'SL', 'How reliably a model trains to good results without repetitive or suboptimal outputs.'],
  ['Adversarial dynamic', 'HL', 'The competition between generator and discriminator that drives both to improve.'],
  ['D-dimensional noise vector', 'HL', 'A list of D random numbers that the generator transforms into a candidate image.'],
  ['Generative adversarial network (GAN)', 'HL', 'A generator and a discriminator trained together competitively to produce realistic images.'],
  ['Discriminator', 'HL', 'Evaluates images against real training data and predicts whether each is real or fake.'],
  ['Generator', 'HL', 'Produces synthetic images from noise vectors, improving by learning to deceive the discriminator.'],
  ['Hybrid model', 'HL', 'Combines different generative AI models to overcome the limitations of a single approach.'],
  ['Flow-based model', 'HL', 'Learns an exact mapping between noise and images that can be reversed without loss.'],
  ['Variational autoencoder (VAE)', 'HL', 'Represents images in a latent space where they can be modified and generated by exploring that space.'],
  ['Latent space', 'HL', 'A compressed and organised version of the data in which similar images are placed close together.'],
  ['Mode collapse', 'HL', 'The generator produces limited variations instead of capturing the full diversity of the dataset.']
];

const CHALLENGES = [
  { level: 'SL', title: 'Managing the iterative denoising process and its computational demands',
    pointers: ['Explain the cause: many steps × a full CNN pass each × high-resolution images.', 'Name the impact on Visionary Studios: slow turnaround, GPU cost, energy, infrastructure limits.', 'Offer solutions: fewer steps (faster samplers), latent diffusion, low-res then upscale, distillation, GPUs/cloud.', 'Evaluate the trade-off: speed and cost against quality and detail.'] },
  { level: 'SL', title: 'Navigating the ethics of large training datasets: IP and bias',
    pointers: ['IP: copyrighted images in training data; licensing; risk of outputs copying protected work.', 'Curation: owned, licensed and public-domain sources; provenance records; respecting opt-outs.', 'Bias: skewed data leads to exclusionary or inaccurate representations; audit, rebalance, test, human review.', 'Transparency: disclose AI use to clients and audiences to keep trust.'] },
  { level: 'HL', title: 'Balancing generator and discriminator performance in GANs',
    pointers: ['Describe the adversarial dynamic and what “balanced” looks like (discriminator ≈ 50% accuracy).', 'Discriminator too strong: little useful feedback, so the generator stalls. Too weak: the generator learns nothing meaningful.', 'Mode collapse: limited variety; bad for campaigns that need diverse assets.', 'Mitigations: balanced learning rates or update ratios, label smoothing, minibatch discrimination, Wasserstein loss.'] },
  { level: 'HL', title: 'Evaluating how a hybrid model could balance VAEs, GANs, flows and diffusion',
    pointers: ['State each model’s strength and weakness: quality, speed, stability, diversity, control, traceability.', 'Give a concrete hybrid: VAE + diffusion (latent diffusion) for speed and quality; adding GAN-style training for few-step generation; flow components for traceability.', 'Weigh the costs: complexity, training effort, possible loss of detail.', 'Conclude for Visionary Studios’ priorities (quality, efficiency, consistency).'] }
];

const EXAM_BANK = [
  { id: 'e1', level: 'SL', q: 'Define the term noise injection.', marks: 2, points: [['Introducing random noise…', ['random', 'noise']], ['…as the starting point for image generation (in a diffusion model)', ['start', 'beginning', 'initial']]] },
  { id: 'e2', level: 'SL', q: 'Outline the difference between text-to-image generation and image-to-image translation.', marks: 2, points: [['Text-to-image creates an image from a written prompt', ['text', 'prompt', 'written', 'description']], ['Image-to-image transforms an existing image into another type (e.g. sketch → render)', ['existing', 'transform', 'sketch', 'convert']]] },
  { id: 'e3', level: 'SL', q: 'Describe the role of the convolutional neural network in a diffusion model.', marks: 3, points: [['It acts as the neural denoiser', ['denois']], ['At each step it predicts/removes some of the noise', ['each step', 'predict', 'remov']], ['Reconstructing features based on patterns learned during training', ['pattern', 'learn', 'feature', 'training']]] },
  { id: 'e4', level: 'SL', q: 'Explain why diffusion models require significant computational resources.', marks: 4, points: LABS[1].write.points },
  { id: 'e5', level: 'SL', q: 'Discuss how Visionary Studios could address the ethical issues of intellectual property and bias when training generative AI models.', marks: 6, points: LABS[5].write.points },
  { id: 'e6', level: 'HL', q: 'Explain how the generator and discriminator in a GAN are trained together.', marks: 4, points: LABS[2].write.points },
  { id: 'e7', level: 'HL', q: 'Describe mode collapse and explain its impact on Visionary Studios.', marks: 3, points: [['The generator produces limited variations…', ['limited', 'similar', 'few', 'same']], ['…instead of the full diversity of the training data', ['diversity', 'variety']], ['Impact: repetitive campaign assets; fails briefs needing varied images; wasted training time', ['repetit', 'campaign', 'client', 'varied', 'waste']]] },
  { id: 'e8', level: 'HL', q: 'Compare variational autoencoders and flow-based models.', marks: 4, points: LABS[3].written[0].points },
  { id: 'e9', level: 'HL', q: 'Evaluate whether a hybrid model combining a VAE, a GAN and a diffusion model would meet Visionary Studios’ needs.', marks: 8, points: [
    ['Diffusion contributes high, photorealistic quality and diversity', ['quality', 'photoreal', 'divers']],
    ['VAE latent space reduces computation (latent diffusion) and enables flexible editing', ['latent', 'compress', 'edit', 'flexib']],
    ['GAN component (adversarial training) can enable sharp, few-step generation', ['gan', 'adversarial', 'few', 'sharp', 'fast']],
    ['Addresses computational efficiency for large campaigns', ['efficien', 'comput', 'campaign', 'speed']],
    ['Risk: GAN training instability / mode collapse may be introduced', ['instab', 'collapse', 'unstable']],
    ['Risk: complexity, training cost and expertise needed', ['complex', 'cost', 'expert', 'maintain']],
    ['Links to consistency / brand needs (embeddings, conditioning)', ['consisten', 'brand', 'embedding', 'style']],
    ['Justified conclusion', ['conclu', 'therefore', 'overall', 'recommend']]] }
];
const MOCKS = { SL: { ids: ['e2', 'e4', 'e5'], minutes: 20 }, HL: { ids: ['e1', 'e3', 'e4', 'e6', 'e7', 'e9'], minutes: 40 } };
