// Critical-thinking content: flawed AI answers, stress tests, transfer tasks, case cards, teacher toolkit.
// kind: 'wrong' = factually incorrect, 'weak' = true-ish but unsupported / not applied / unjustified.
const FLAWED = {
  1: { q: 'Distinguish between conditional and unconditional image generation. [4]', s: [
    ['Conditional models generate images from specific inputs such as class labels, sketches or segmentation maps.'],
    ['This means the output can be aligned with predefined objectives or artistic styles.'],
    ['Unconditional models also need an input, but it is a short text prompt rather than a sketch.', 'wrong', 'Unconditional generation has no predefined input. A text prompt makes it text-to-image generation.', 'Lines 30–33'],
    ['Because they have no input, unconditional models can produce any image, even of things missing from their training data.', 'wrong', 'They rely solely on patterns learned from training data, so they cannot produce content the data never contained.', 'Lines 30–31, 39–42'],
    ['Visionary Studios could use unconditional generation to create synthetic datasets for training other AI models.']] },
  2: { q: 'Explain why diffusion models require significant computational resources. [4]', s: [
    ['Diffusion models need significant computational resources because a generator and a discriminator compete.', 'wrong', 'A generator and discriminator belong to GANs, not diffusion models.', 'Lines 49–52'],
    ['Generation starts from random noise, introduced as the starting point.'],
    ['The image is then produced in a single pass at high resolution.', 'wrong', 'Diffusion is iterative: the image is refined over many denoising steps.', 'Lines 36–38'],
    ['At each step a CNN removes some noise, reconstructing features learned in training.'],
    ['To reduce costs, Visionary Studios should increase the number of denoising steps, which makes generation faster.', 'wrong', 'More steps means more CNN passes, so generation becomes slower, not faster.', 'Lines 43–45']] },
  3: { q: 'Explain how the adversarial dynamic leads to realistic images. [4]', s: [
    ['The generator turns a D-dimensional noise vector into a candidate image.'],
    ['The discriminator then improves the image by removing noise from it step by step.', 'wrong', 'The discriminator does not edit images: it predicts whether each one is real or fake. Step-by-step denoising is diffusion.', 'Lines 51–52'],
    ['The two networks are trained separately, one after the other has finished.', 'wrong', 'They are trained together in a competitive framework.', 'Lines 52–54'],
    ['As the generator learns to deceive the discriminator, its images become more realistic.'],
    ['Mode collapse is when the discriminator becomes too strong and stops working.', 'wrong', 'Mode collapse is when the generator produces limited variations instead of the dataset’s full diversity.', 'Lines 56–58']] },
  4: { q: 'Compare VAEs and flow-based models for Visionary Studios. [4]', s: [
    ['A VAE learns a latent space, a compressed and organised version of the data.'],
    ['In the latent space, very different images are placed close together so they can be mixed.', 'wrong', 'Similar images are placed close together; that is what makes the space organised.', 'Lines 65–66'],
    ['Flow-based models learn an exact mapping between noise and images that can be reversed without loss.'],
    ['Because of this, flow-based models are the best choice for experimentation and artistic exploration.', 'wrong', 'VAEs suit flexibility and exploration; flows suit precision, reproducibility and transparency.', 'Lines 68–69, 72–73'],
    ['Hybrid models always need less computing power than a single model.', 'weak', 'Not supported by the booklet. Some hybrids (e.g. latent diffusion) reduce computation, but combining models can add complexity and cost. “Always” is an overclaim.', 'Lines 61–63, 74–75']] },
  5: { q: 'Discuss two criteria Visionary Studios should use when choosing a model. [6]', s: [
    ['Output quality matters because clients expect high-resolution, photorealistic, stylistically coherent images.'],
    ['Computational efficiency only matters during training, not when the model is deployed.', 'wrong', 'The booklet asks whether infrastructure can support both training and deployment.', 'Lines 81–82'],
    ['Training stability is never a concern for diffusion models or GANs.', 'wrong', 'Some models produce repetitive or suboptimal outputs; GANs in particular are unstable.', 'Lines 56–58, 83–85'],
    ['Character consistency can be supported with embedding-based approaches.'],
    ['Therefore the best model is always the one with the highest output quality.', 'weak', 'An unjustified conclusion: it ignores the trade-off with efficiency, stability and consistency, and is not applied to a specific brief.', 'Lines 76–78']] },
  6: { q: 'Discuss the ethical considerations of training on large datasets. [6]', s: [
    ['Training datasets should be curated to avoid copyrighted material and comply with IP law.'],
    ['If an image is publicly visible online, it is automatically free to use for training.', 'wrong', 'Being visible online does not grant a licence. Curation must check rights.', 'Lines 99–100'],
    ['Biased datasets can lead to exclusionary or inaccurate representations.'],
    ['Bias can be fully removed by simply making the dataset bigger.', 'weak', 'A bigger but still skewed dataset stays skewed. Bias needs auditing, rebalancing and testing, and “fully removed” is an overclaim.', 'Lines 101–102'],
    ['Disclosing AI-generated content is optional because clients only care about the final image.', 'wrong', 'The booklet calls for clear disclosure guidelines to maintain trust with clients and audiences.', 'Lines 103–105']] },
  7: { q: 'Evaluate whether Visionary Studios should use a diffusion model for its advertising campaigns. [6]', s: [
    ['Diffusion models produce high-quality, photorealistic images, which suits advertising.'],
    ['Diffusion models are fast because they use a CNN.', 'wrong', 'Using a CNN does not make them fast. The iterative process makes diffusion slow and computationally demanding.', 'Lines 43–45'],
    ['Famous tools such as DALL·E and Stable Diffusion exist.', 'weak', 'True, but it is not evaluation: it does not weigh anything or apply it to Visionary Studios.', 'Line 20'],
    ['However, training stability can be a major issue for diffusion models.', 'wrong', 'Training instability is a GAN problem; diffusion models generally train stably.', 'Lines 56–58'],
    ['Therefore Visionary Studios should definitely use diffusion models.', 'weak', 'The conclusion is not justified: no cost/benefit weighing, no alternatives, no reference to the studio’s infrastructure.', '—']] },
  8: { q: 'Use key terms to describe how Visionary Studios might create an image. [5]', s: [
    ['Noise injection is the process of removing noise from an image.', 'wrong', 'Noise injection introduces random noise as the starting point; removing it is denoising.', 'Line 37'],
    ['A segmentation map labels every pixel of an image with a class.'],
    ['A segmentation map is the input used for unconditional image generation.', 'wrong', 'Unconditional generation has no predefined input. A segmentation map is an input for conditional generation.', 'Lines 24–25, 30–31'],
    ['Image-to-image translation can turn a sketch into a realistic rendering.'],
    ['Style adherence means the same character looks identical across images.', 'wrong', 'That is character consistency. Style adherence means matching the style or theme in the prompt.', 'Lines 91–95']] }
};

const STRESS = {
  1: [['Your client suddenly needs the product in exactly the same position in every image. Which technique becomes essential?', 'Conditional generation with a layout input (segmentation map or sketch): a prompt alone cannot guarantee positions, and unconditional generation gives no control.'],
      ['When would unconditional generation be a better choice than text-to-image?', 'When you want novelty or volume without steering: exploratory concept art, abstract visuals, or large synthetic datasets where writing a prompt per image would be impractical.']],
  2: [['If GPUs became 10× faster tomorrow, which case-study challenge would shrink, and which would not change at all?', 'The computational challenge shrinks (but does not disappear at high volume or resolution). The ethical challenge of IP and bias is unaffected: faster hardware does not fix the data.'],
      ['Your client needs only 12 images, but for billboards. Is cutting the number of steps still sensible?', 'Probably not: with few images, total time is small, and billboards need maximum detail. Spend compute on quality. Cutting steps matters most for large volumes.']],
  3: [['What would have to be true for a GAN to beat diffusion for Visionary Studios?', 'Speed would need to matter more than diversity and peak quality (e.g. huge volumes, tight deadlines), and the studio would need the expertise to keep training balanced and avoid mode collapse.'],
      ['The discriminator is 100% accurate. Is that good news?', 'No. It means the generator’s fakes are easy to spot and it gets little useful feedback. The healthy end point is a discriminator near 50%.']],
  4: [['When is adding a flow-based component worth the extra complexity?', 'When traceability matters: audits, legal disputes, or exact reproduction of assets. Otherwise the cost in model size and memory may not be justified.'],
      ['If the studio only ever makes one kind of image, does a hybrid still make sense?', 'Possibly not. If one model already meets quality, speed and consistency needs for that single use, a hybrid adds complexity without much benefit.']],
  5: [['Which single change to your client’s brief would flip your recommendation?', 'Look for the criterion with the biggest gap between models (often efficiency or quality). Changing its weight, e.g. a much tighter deadline, is usually what flips it.'],
      ['Is the highest weighted score always the right choice? What does the matrix not capture?', 'No. Ratings are estimates and weights are judgements. The matrix ignores ethics, staff expertise, licensing costs and risk. Use it to structure a decision, not replace one.']],
  6: [['Is a smaller, fully licensed dataset better than a larger one with some unclear images? When might the answer change?', 'Usually yes: legal risk and trust outweigh a quality gain. It might change if the unclear images can be cleared or licensed, or if the smaller set is too small to train a useful model.'],
      ['Who should decide what “balanced” representation means for a campaign?', 'Not the model. It should be agreed by people: the studio, the client, and ideally the communities represented, guided by the campaign’s audience and context.']],
  7: [['Which part of your recommendation are you least confident about, and what evidence would settle it?', 'Strong answers name a specific uncertainty (e.g. real generation time on the studio’s hardware) and a test that would resolve it (e.g. a pilot batch of 100 images).']],
  8: [['Pick two terms you could confuse. Write a question that would expose the confusion.', 'For example: “A model starts from random numbers and refines them over 50 steps. Is that noise injection, denoising, or both?” (Both: noise injection is the start; denoising is the process.)']]
};

const TRANSFER = {
  1: ['A hospital wants synthetic X-ray images to train a diagnosis model. Which generation mode fits, and what new risk appears?', 'Unconditional or class-conditional (e.g. “healthy” vs “fracture”) generation fits. New risks: unrealistic artefacts could teach the diagnosis model wrong patterns, and real patient scans used for training raise privacy issues.'],
  2: ['A music company uses a diffusion model to generate 30-second songs. Which parts of the computational challenge carry over?', 'The iterative denoising cost carries over directly: many steps × a large network × lots of data per second of audio. Optimisations (fewer steps, latent representations) apply too.'],
  3: ['A bank uses a GAN to generate fake transaction data for testing fraud detection. What would mode collapse look like, and why is it dangerous?', 'The GAN would produce only a few types of transaction. Fraud detection tested on that data would miss rarer patterns, giving false confidence.'],
  4: ['A game studio wants players to “slide” smoothly between two level designs to create new ones. Which model property is most useful?', 'A VAE’s organised latent space: points between two designs decode to plausible in-between levels.'],
  5: ['A news agency wants AI images to illustrate articles. Which evaluation criterion becomes more important than it is for Visionary Studios?', 'Accuracy and transparency: images must not mislead readers about real events, so disclosure and avoiding realistic fakes of real people or places outweigh style and speed.'],
  6: ['A school asks an AI for “a typical scientist” for its posters. What should it check before printing?', 'Whether the outputs reproduce stereotypes (gender, ethnicity, age) from biased training data; it should review several outputs, adjust prompts, and disclose AI use.'],
  7: ['Swap case cards with a classmate. Apply your recommendation to their client. What changes, and what stays?', 'The reasoning method stays (criteria, trade-offs, evidence). The recommendation may change, because constraints such as volume, deadline and audit needs change the weights.'],
  8: null
};

const EVIDENCE = {
  1: 'Which generation mode(s) suit your client? Describe what you tried in the studio that supports your choice.',
  2: 'Use your case card values in the cost panel. Record the time per image and the total time. Can you meet your deadline? What would you change?',
  3: 'From the GAN arena: what risks would a GAN bring for your client? Quote your epoch, accuracy and diversity readings.',
  4: 'Which combination in the hybrid builder fits your client best? Note its scores and the trade-off you accept.',
  5: 'Use the “Your client” brief. Record your weights, the winning model, its score, and why you set each weight.',
  6: 'Which images did you exclude or add? Record your final IP risk, representation and size, and how your client’s special requirement affected your choices.'
};

const CASE = {
  clients: [['Alpine Tourism Board', 'travel posters'], ['NovaPhone', 'a smartphone launch campaign'], ['Little Explorers', 'a children’s game mascot'], ['Riverside Hospital', 'patient-information leaflets'], ['Urban Threads', 'fashion social-media posts'], ['GreenGrid Energy', 'annual-report artwork']],
  images: [12, 150, 800, 3000, 20000],
  deadline: [['48 hours', 48], ['1 week', 168], ['1 month', 720]],
  hardware: [['2 older GPUs in-house', 2], ['8 modern GPUs in-house', 8], ['a €500 cloud budget (≈ 4 GPUs)', 4], ['a €5,000 cloud budget (≈ 32 GPUs)', 32]],
  quality: [['billboard photorealism', 1024], ['social-media quality', 512], ['flat illustration style', 512]],
  special: ['the same mascot must appear in every image', 'the client may audit exactly how each image was made', 'images will show people from many backgrounds', 'the client forbids any scraped training images', 'all images must be labelled as AI-generated', 'everything must run on-premises for confidentiality']
};
function caseCard(name) {
  let hsh = 2166136261; for (const ch of (name || '').trim().toLowerCase()) { hsh ^= ch.charCodeAt(0); hsh = Math.imul(hsh, 16777619) >>> 0; }
  const r = IMG.rng(hsh % 100000 + 1), pick = (a) => a[Math.floor(r() * a.length)];
  const c = { code: String(hsh % 9000 + 1000), client: pick(CASE.clients), images: pick(CASE.images), deadline: pick(CASE.deadline), hardware: pick(CASE.hardware), quality: pick(CASE.quality), special: pick(CASE.special) };
  c.weights = [c.quality[1] === 1024 ? 5 : 3, c.images >= 3000 || c.deadline[1] <= 48 ? 5 : c.images <= 12 ? 1 : 3, 3, 3, /mascot/.test(c.special) ? 5 : 3];
  return c;
}

const COMPARE = {
  q: 'Explain why diffusion models require significant computational resources. [4]',
  a: 'Diffusion models are a very powerful and modern type of generative AI that is used in many famous tools. They create amazing, high-quality images, which is why they need a lot of computational resources. Because the images are so good, the computer has to work very hard, and this uses a lot of power and memory. This is a challenge for many companies today.',
  b: 'Generation is iterative: the model refines noise over many steps (up to 1,000 in DDPM). Each step is a full pass through a large CNN. At high resolution every pass processes millions of values. So for a campaign of thousands of images, Visionary Studios would need substantial GPU time and memory.',
  marks: [1, 4],
  comment: 'Answer A is fluent but empty: it repeats “high quality = hard work” without naming the mechanism (iterative steps, a CNN pass per step, resolution) and never applies it. At most 1 mark. Answer B is shorter but every sentence is a cause → effect point using case-study terms, ending with application: 4 marks. Length and confident tone are not evidence of quality, and AI text is often like Answer A.'
};

const ROLES = [
  ['Finance director', 'Cost and return on investment', 'How much will generation cost per campaign, and can we afford the hardware?', 'Challenge anyone who recommends 1,000-step diffusion at high volume.'],
  ['Art director', 'Quality, style adherence and character consistency', 'Will the images be good enough for our best clients, and stay on-brand?', 'Challenge anyone who sacrifices quality for speed without evidence.'],
  ['Legal counsel', 'Intellectual property, licences and disclosure', 'Can we prove every training image is properly licensed?', 'Challenge any plan that uses scraped or unclear data.'],
  ['Ethics lead', 'Bias, fairness and public trust', 'Whose faces and cultures will our images represent, and who checks?', 'Challenge any plan with no bias audit or human review.'],
  ['Chief technology officer', 'Infrastructure, training stability and scalability', 'Can our servers and staff actually train and run this model?', 'Challenge anyone who recommends a GAN without a plan for instability.']
];

const VIVA = {
  1: ['Why does a segmentation map give more control than a prompt?', 'What would an unconditional model trained only on cities never produce?', 'Give a Visionary Studios use for image-to-image translation.', 'If your prompt is vague, which input type could fix the problem?'],
  2: ['Why does halving the steps roughly halve the time?', 'What does the CNN actually predict at each step?', 'Why does the same noise give a different image with a different dataset?', 'Name one optimisation and its trade-off.'],
  3: ['Why is a discriminator at 50% accuracy a good sign?', 'What exactly does the generator learn from the discriminator?', 'Why would mode collapse hurt an advertising campaign?', 'What would you do if the discriminator wins too early?'],
  4: ['Why are similar images close together in a latent space?', 'What does a flow model give up in exchange for reversibility?', 'Why is Stable Diffusion called a hybrid?', 'When would you NOT use a hybrid?'],
  5: ['Which criterion matters most for your client, and why?', 'What would flip your recommendation?', 'What does the scoring matrix fail to capture?', 'How would you test consistency before delivering to a client?'],
  6: ['Is a public image automatically free to train on? Why not?', 'How would you detect bias in a model’s outputs?', 'Why disclose AI use if nobody can tell?', 'What is the cost of removing risky images, and how do you offset it?'],
  7: ['Read me your conclusion. What evidence supports it?', 'Which counter-argument is strongest against your recommendation?', 'How did you use AI, and what did you change?', 'What would you need to know to be more certain?'],
  8: ['Explain the difference between noise injection and denoising.', 'Character consistency vs style adherence: give an example of each.', 'Define latent space without using the word “space”.', 'Which term would you use to describe a GAN producing only cats?']
};
