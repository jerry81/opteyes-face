# opteyes-face

### try tensor flow breakdown

template - canvas, video, div (for scatter plot)

## tensorflow paper 

### Intro

[whitepaper on face mesh prediction](https://arxiv.org/pdf/1907.06724.pdf)

e2e neural network based model for inferring approx 3D mesh representation of human face from cam input

468 verticies 

face alignment - problem of predicting facial gemoetry by aligning facial mesh template, typically 68 landmarks 

alternative - estimate pose, scale, parameters of 3D morphable model 

3DMM - 3d morphable model 

BFM2017 - 2017 edition of basel face model - contains over 50K points 
difficult case for bfm: represent face with one eye closed 

estimate 3D mesh verticies with neural network

targeted applications: expressive AR effects, virtual accessory and apparel tryon and makeup 

input: no depth info is required 

uses mobile GPU inference for depth 

also lighter versions allowing for CPU inference 

GPU inference - in 2015, nvidia had an article: gpus are good at neural network inference 
inference vs training - training back-propagates errors and updates weights using gradient descent
whereas inference is just applying a model to make predictions on new data 


### Pipeline

1.  camera snapshot is input
2.  face detector processes input - gets face bounding rectangles and general landmarks (eye centers, nose tip, ear tragion) 
3.  align facial rectangle (rotate) to align line connecting horizontal line between eyes 
4.  rectangle represents angle of face, cropped from original image and resized to fit input of NN (256 x 256 max, 128 x 128 min)
5.  output is 3d landmark coordinates
6.  map coordinates back to original img coordinate system (projection)
7.  for video: facial crop from previous frames reused until probability of predictions falls below threshold 

for training:
1.  30K mobile camera photos 
2.  with metadata on cropping and img processing primitives 

for obtaining 468 3d mesh points for training

0. they do not manually annotate points one by one 
1.  instead, train initial model "2 sources of supervision"
    a.  3dMM over facial rectangles of photos immediately available vertex coordinates 
    b.  2D landmarks of small subset (like the one from face API)
using initial model and 30% of the output from it, suitable for next step
2.  refine x and y of bootstrapped coordintes manually with annotation tools - allows multiple points to be moved at once

nn model architecture 

1.  residual nn architecture - based on pyramidal cells - skips over some layers of network 
2.  "aggressive subsampling" in early layers - sub-sampling - technique to use a part of data , like chunking
3.  "shallow part" of neural network - earlier layers?
4.  completes face even if slightly occluded
5.  turns low-dimensional mesh into coordinates in last layers of network 

between frames

1.  only passing facial bounding rotated rectangle 
2.  jitter - pixel-level inconsistencies across video frames affects individual landmarks more, caused by head pose, lighting, camera noise) 
3.  solution to jitter: one-dimensional temporal filter, noise reduction and "phase lag elimination" - these are mutually exclusive - we prefer noise reduction as humans (stabilization) when inputs dont change quickly
and prefer phase lag elimination when rate of change is high
4.  velocity estimation used to attempt to remove phase lag - less lag with smaller inputs (128 with strong lighting), larger errors is the tradeoff


### definitions

ground truth - empirically correct data 

phase lag elimination - angular diff between point where control input to rotor blade and max displacement of blade - in our context it is lag between input and output

IOD - interocular distance 

MAD - mean absolute distance - prediction - ground truth

supervised maachine - learning a function based on example input-output pairs